import { Hono } from 'hono'
import {
  handleSendVerificationCode,
  handleVerifyAndRegister,
  handleLogin,
  handleRefreshSession,
  handleForgotPasswordRequest,
  handleResetPassword,
  authMiddleware,
  handleAfdianWebhook,
  handleRefreshUserToken,
} from '../lib/auth.js'
import {
  handleCreateDeck,
  handleGetDecks,
  handleGetDeckByKey,
  handleDeleteDeck,
  handleUpdateDeck,
} from '../lib/decks.js'
import {
  createRateLimiter,
  emailBodyKeyExtractor,
  ipKeyExtractor,
  userIdFromJwtKeyExtractor,
} from '../lib/ratelimit.js'
import { handleInitiatePayment } from '../lib/payments.js'

const app = new Hono().basePath('/api')

// === Rate Limiter Middlewares ===
const authCodeLimiter = (c, next) =>
  createRateLimiter({
    limiter: c.env.AUTH_CODE_LIMITER,
    keyExtractor: emailBodyKeyExtractor,
  })(c, next)

const authActionLimiter = (c, next) =>
  createRateLimiter({
    limiter: c.env.AUTH_ACTION_LIMITER,
    keyExtractor: ipKeyExtractor,
  })(c, next)

const apiUserLimiter = (c, next) =>
  createRateLimiter({
    limiter: c.env.API_USER_LIMITER,
    keyExtractor: userIdFromJwtKeyExtractor,
  })(c, next)

const publicReadLimiter = (c, next) =>
  createRateLimiter({
    limiter: c.env.PUBLIC_READ_LIMITER,
    keyExtractor: ipKeyExtractor,
  })(c, next)

// === 公開的 Auth 路由 ===
const authRoutes = new Hono()
authRoutes.post('/register/send-code', authCodeLimiter, handleSendVerificationCode)
authRoutes.post('/register/verify', authActionLimiter, handleVerifyAndRegister)
authRoutes.post('/login', authActionLimiter, handleLogin)
authRoutes.post('/session/refresh', handleRefreshSession) // No rate limit on refresh for now
authRoutes.post('/password/forgot', authCodeLimiter, handleForgotPasswordRequest)
authRoutes.post('/password/reset', authActionLimiter, handleResetPassword)

authRoutes.get('/refresh-token', authMiddleware, apiUserLimiter, handleRefreshUserToken)

// === 受保護的 Deck 路由 ===
const deckRoutes = new Hono()
deckRoutes.use('/*', authMiddleware, apiUserLimiter)
deckRoutes.post('/', handleCreateDeck)
deckRoutes.put('/:key', handleUpdateDeck)
deckRoutes.get('/', handleGetDecks)
deckRoutes.delete('/:key', handleDeleteDeck)

// === 公開的 Deck 路由 ===
const publicDeckRoutes = new Hono()
publicDeckRoutes.use('/*', publicReadLimiter)
publicDeckRoutes.get('/:key', handleGetDeckByKey)

// === 受保護的 Payment 路由 ===
const paymentRoutes = new Hono()
paymentRoutes.use('/*', authMiddleware, apiUserLimiter) // 必須登入才能創建訂單
paymentRoutes.post('/initiate', handleInitiatePayment)

// === Webhook 路由 (公開, 但受簽名保護) ===
const webhookRoutes = new Hono()
webhookRoutes.post('/afdian', handleAfdianWebhook)

// === 組合所有路由 ===
app.route('/', authRoutes)
app.route('/decks', deckRoutes)
app.route('/shared-decks', publicDeckRoutes)
app.route('/webhooks', webhookRoutes)
app.route('/payments', paymentRoutes)

export default app
