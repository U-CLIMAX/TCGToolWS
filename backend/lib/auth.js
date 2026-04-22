import { sign, verify } from 'hono/jwt'
import { scrypt, randomBytes } from 'node:crypto'
import { promisify } from 'node:util'
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/brevo.js'
import { verifyAfdianSignature } from '../services/afdian.js'
import { processAfdianOrder } from './payments.js'
import { createErrorResponse } from './utils.js'

const scryptAsync = promisify(scrypt)
const SCRYPT_PREFIX = '$scrypt$v1$'
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keyLen: 64 }

/**
 * Utility: Convert ArrayBuffer to Hex string
 */
const arrayBufferToHex = (buffer) => {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Utility: Hash password using scrypt
 */
const hashPassword = async (password, salt) => {
  const derivedKey = await scryptAsync(password, salt, SCRYPT_PARAMS.keyLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  })
  return SCRYPT_PREFIX + derivedKey.toString('hex')
}

/**
 * Utility: Hash password using SHA-256 with salt (Legacy)
 */
const hashPasswordLegacy = async (password, salt) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return arrayBufferToHex(hashBuffer)
}

/**
 * Utility: Generate 6-digit verification code
 */
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Handler: Send registration verification code
 */
export const handleSendVerificationCode = async (c) => {
  const db = c.env.DB
  const brevoApiKey = c.env.BREVO_API_KEY

  try {
    const { email, password } = await c.req.json()

    if (!email) return createErrorResponse(c, 400, '请提供邮箱地址')
    if (!password) return createErrorResponse(c, 400, '请提供密码')
    if (password.length < 8) return createErrorResponse(c, 400, '密码长度不能少于8位')

    const existingUser = await db
      .prepare('SELECT id FROM users WHERE email = ?1')
      .bind(email)
      .first()

    if (existingUser) {
      return createErrorResponse(c, 409, '此邮箱已被注册')
    }

    const verificationCode = generateVerificationCode()
    const expiresAt = Math.floor(Date.now() / 1000) + 600
    const salt = randomBytes(16).toString('hex')
    const hashedPassword = await hashPassword(password, salt)

    await db
      .prepare(
        'INSERT INTO pending_registrations (email, hashed_password, salt, verification_code, expires_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(email) DO UPDATE SET hashed_password=excluded.hashed_password, salt=excluded.salt, verification_code=excluded.verification_code, expires_at=excluded.expires_at'
      )
      .bind(email, hashedPassword, salt, verificationCode, expiresAt)
      .run()

    await sendVerificationEmail(email, verificationCode, brevoApiKey)

    return c.json({ success: true, message: '验证码已发送至您的邮箱' })
  } catch (error) {
    console.error('Error sending verification code:', error)
    return createErrorResponse(c, 500, error.message || '服务器内部错误')
  }
}

/**
 * Handler: Verify code and complete registration
 */
export const handleVerifyAndRegister = async (c) => {
  const db = c.env.DB
  try {
    const { email, code } = await c.req.json()
    if (!email || !code) return createErrorResponse(c, 400, '需要邮箱和验证码')

    const pending = await db
      .prepare('SELECT * FROM pending_registrations WHERE email = ?1')
      .bind(email)
      .first()

    if (!pending) return createErrorResponse(c, 400, '验证失败，请重新注册')
    if (Math.floor(Date.now() / 1000) > pending.expires_at) {
      return createErrorResponse(c, 400, '验证码已过期，请重新注册')
    }
    if (pending.verification_code !== code) {
      return createErrorResponse(c, 400, '验证码错误')
    }

    const id = crypto.randomUUID()
    await db
      .prepare(
        'INSERT INTO users (id, email, hashed_password, salt, last_login_time) VALUES (?1, ?2, ?3, ?4, ?5)'
      )
      .bind(id, pending.email, pending.hashed_password, pending.salt, Math.floor(Date.now() / 1000))
      .run()

    await db.prepare('DELETE FROM pending_registrations WHERE email = ?1').bind(email).run()

    return c.json({ success: true, message: '帐号注册成功！' }, 201)
  } catch (error) {
    console.error('Error in registration verification:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Handler: User login
 */
export const handleLogin = async (c) => {
  const db = c.env.DB
  const secret = c.env.JWT_SECRET

  try {
    const { email, password } = await c.req.json()
    if (!email || !password) return createErrorResponse(c, 400, '需要邮箱和密码')

    const user = await db
      .prepare(
        'SELECT id, hashed_password, salt, role, premium_expire_time FROM users WHERE email = ?1'
      )
      .bind(email)
      .first()

    if (!user) return createErrorResponse(c, 401, '无效的邮箱或密码')

    const isScrypt = user.hashed_password.startsWith(SCRYPT_PREFIX)
    let isPasswordCorrect = false
    let migrationNeeded = false

    if (isScrypt) {
      const hashedPasswordAttempt = await hashPassword(password, user.salt)
      isPasswordCorrect = hashedPasswordAttempt === user.hashed_password
    } else {
      const hashedPasswordAttempt = await hashPasswordLegacy(password, user.salt)
      isPasswordCorrect = hashedPasswordAttempt === user.hashed_password
      if (isPasswordCorrect) migrationNeeded = true
    }

    if (!isPasswordCorrect) return createErrorResponse(c, 401, '无效的邮箱或密码')

    const currentTime = Math.floor(Date.now() / 1000)
    if (migrationNeeded) {
      const newSalt = randomBytes(16).toString('hex')
      const newHashedPassword = await hashPassword(password, newSalt)
      await db
        .prepare(
          'UPDATE users SET hashed_password = ?1, salt = ?2, last_login_time = ?3 WHERE id = ?4'
        )
        .bind(newHashedPassword, newSalt, currentTime, user.id)
        .run()
    } else {
      await db
        .prepare('UPDATE users SET last_login_time = ?1 WHERE id = ?2')
        .bind(currentTime, user.id)
        .run()
    }

    const payload = {
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
      role: user.role,
      p_exp: user.premium_expire_time || null,
    }
    const token = await sign(payload, secret, 'HS256')

    return c.json({
      success: true,
      message: '登录成功',
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Handler: Refresh session and issue new JWT
 */
export const handleRefreshSession = async (c) => {
  const db = c.env.DB
  const secret = c.env.JWT_SECRET
  const user = c.get('user')

  try {
    const currentTime = Math.floor(Date.now() / 1000)
    await db
      .prepare('UPDATE users SET last_login_time = ?1 WHERE id = ?2')
      .bind(currentTime, user.id)
      .run()

    const newPayload = {
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // Renew 7 days
      role: user.role,
      p_exp: user.premium_expire_time || null,
    }
    const newToken = await sign(newPayload, secret, 'HS256')

    return c.json({ success: true, token: newToken })
  } catch (error) {
    console.error('Session refresh error:', error.message)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Handler: Request password reset email
 */
export const handleForgotPasswordRequest = async (c) => {
  const db = c.env.DB
  const brevoApiKey = c.env.BREVO_API_KEY
  const frontendUrl = c.env.FRONTEND_URL

  if (!frontendUrl) {
    console.error('FATAL: FRONTEND_URL environment variable is not set.')
    return createErrorResponse(c, 500, '服务器配置错误')
  }

  try {
    const { email } = await c.req.json()
    if (!email) return createErrorResponse(c, 400, '需要提供邮箱地址')

    const user = await db.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first()

    // Security: Return same response regardless of user existence to prevent enumeration
    if (user) {
      const resetToken = crypto.randomUUID()
      const expiresAt = Math.floor(Date.now() / 1000) + 3600 // 1 hour

      await db
        .prepare('INSERT INTO password_resets (token, user_id, expires_at) VALUES (?1, ?2, ?3)')
        .bind(resetToken, user.id, expiresAt)
        .run()

      await sendPasswordResetEmail(email, resetToken, brevoApiKey, frontendUrl)
    }

    return c.json({ success: true, message: '如果该邮箱已注册，您将会收到一封密码重置邮件' })
  } catch (error) {
    console.error('Forgot password request error:', error)
    return c.json({ success: true, message: '如果该邮箱已注册，您将会收到一封密码重置邮件' })
  }
}

/**
 * Handler: Reset password using token
 */
export const handleResetPassword = async (c) => {
  const db = c.env.DB
  try {
    const { token, password } = await c.req.json()
    if (!token || !password || password.length < 8) {
      return createErrorResponse(c, 400, '需要提供有效的 Token 和至少 8 位的新密码')
    }

    const resetRequest = await db
      .prepare('SELECT * FROM password_resets WHERE token = ?1')
      .bind(token)
      .first()

    if (!resetRequest) return createErrorResponse(c, 400, '无效的重置链接')

    if (Math.floor(Date.now() / 1000) > resetRequest.expires_at) {
      await db.prepare('DELETE FROM password_resets WHERE token = ?1').bind(token).run()
      return createErrorResponse(c, 400, '重置链接已过期，请重新申请')
    }

    const salt = randomBytes(16).toString('hex')
    const hashedPassword = await hashPassword(password, salt)

    await db
      .prepare('UPDATE users SET hashed_password = ?1, salt = ?2 WHERE id = ?3')
      .bind(hashedPassword, salt, resetRequest.user_id)
      .run()

    await db.prepare('DELETE FROM password_resets WHERE token = ?1').bind(token).run()

    return c.json({ success: true, message: '密码重置成功，请使用新密码登录' })
  } catch (error) {
    console.error('Reset password error:', error)
    return createErrorResponse(c, 500, '服务器内部错误，请稍后重试')
  }
}

/**
 * Handler: Afdian Webhook (Donation/Payment)
 */
export const handleAfdianWebhook = async (c) => {
  const db = c.env.DB
  let payload

  try {
    payload = await c.req.json()
  } catch (error) {
    console.error('Afdian Webhook: Failed to parse JSON body', error)
    return c.json({ ec: 400, em: 'Invalid JSON' })
  }

  const signStr = payload.data.sign
  const isVerified = await verifyAfdianSignature(c.env.AFDIAN_PUBLIC_KEY, payload, signStr, c.env)

  if (!isVerified) {
    console.warn('Afdian Webhook: Invalid signature.')
    return c.json({ ec: 403, em: 'Invalid signature' })
  }

  const AFDIAN_TEST_USER_ID = 'adf397fe8374811eaacee52540025c377'
  if (
    payload &&
    payload.data &&
    payload.data.order &&
    payload.data.order.user_id === AFDIAN_TEST_USER_ID
  ) {
    console.warn('Afdian official test webhook received.')
    return c.json({ ec: 200, em: 'Test Request Received OK' })
  }

  if (payload.ec !== 200 || !payload.data || payload.data.type !== 'order') {
    return c.json({ ec: 200, em: 'Payload not an order' })
  }

  const order = payload.data.order
  if (order.status !== 2) {
    return c.json({ ec: 200, em: 'Order not successful' })
  }

  return processAfdianOrder(c, db, payload)
}

/**
 * Middleware: Verify JWT and inject user context
 */
export const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const secret = c.env.JWT_SECRET

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createErrorResponse(c, 401, 'Unauthorized: No token provided')
  }

  const token = authHeader.substring(7)

  try {
    const payload = await verify(token, secret, 'HS256')
    const user = await c.env.DB.prepare(
      'SELECT id, role, premium_expire_time FROM users WHERE id = ?1'
    )
      .bind(payload.sub)
      .first()

    if (!user) return createErrorResponse(c, 401, 'Unauthorized: User not found')

    const now = Math.floor(Date.now() / 1000)
    let effectiveRole = user.role
    let effectivePremiumTime = user.premium_expire_time

    // Handle premium expiration
    if (user.role === 1 && user.premium_expire_time && user.premium_expire_time < now) {
      effectiveRole = 0
      effectivePremiumTime = null

      // Downgrade user role asynchronously
      c.executionCtx.waitUntil(
        c.env.DB.prepare('UPDATE users SET role = 0 WHERE id = ?1').bind(user.id).run()
      )
    }

    c.set('user', {
      id: user.id,
      role: effectiveRole,
      premium_expire_time: effectivePremiumTime,
    })
    c.set('jwtPayload', payload)
    await next()
  } catch (error) {
    return createErrorResponse(c, 401, `Unauthorized: ${error.message}`)
  }
}
