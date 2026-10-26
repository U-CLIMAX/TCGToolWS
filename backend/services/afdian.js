import { processAfdianOrder } from '../lib/payments.js'

const AFDIAN_TEST_USER_ID = 'adf397fe8374811eaacee52540025c377'

/**
 * Base64 轉 ArrayBuffer
 * @param {string} b64
 * @returns {ArrayBuffer}
 */
const base64ToArrayBuffer = (b64) =>
  Uint8Array.from(atob((b64 || '').replace(/\s/g, '')), (c) => c.charCodeAt(0)).buffer

/**
 * 匯入愛發電 RSA 公鑰
 * @param {string} pem
 * @returns {Promise<CryptoKey>}
 */
const importAfdianPublicKey = (pem) => {
  const binaryDer = base64ToArrayBuffer(pem.replace(/-----[^-]+-----|\s/g, ''))
  return crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  )
}

/**
 * 校驗愛發電數位簽名
 * @param {string} publicKeyPem
 * @param {object} payload
 * @param {string} sign
 * @returns {Promise<boolean>}
 */
export const verifyAfdianSignature = async (publicKeyPem, payload, sign) => {
  if (!publicKeyPem || !sign) return false

  try {
    const order = payload?.data?.order
    if (!order) return false

    const signStr = `${order.out_trade_no || ''}${order.user_id || ''}${order.plan_id || ''}${order.total_amount || ''}`
    const key = await importAfdianPublicKey(publicKeyPem)

    return await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      base64ToArrayBuffer(sign),
      new TextEncoder().encode(signStr)
    )
  } catch {
    return false
  }
}

/**
 * 愛發電 Webhook 接收端
 * 規範：返回 JSON 最少包含 {"ec": 200}，官方規範範例為 {"ec": 200, "em": ""}
 * @type {AppHandler}
 */
export const handleAfdianWebhook = async (c) => {
  let payload
  try {
    payload = await c.req.json()
  } catch {
    return c.json({ ec: 400, em: 'Invalid JSON' })
  }

  const order = payload?.data?.order

  // 1. 愛發電後台「點擊發送測試」的官方請求（無 sign 簽名，直接回傳 ec: 200）
  if (order?.user_id === AFDIAN_TEST_USER_ID) {
    return c.json({ ec: 200, em: '' })
  }

  // 2. 簽名驗證
  const sign = payload.data.sign

  const isBypassed = c.env.AFDIAN_WEBHOOK_BYPASS_TOKEN && sign === c.env.AFDIAN_WEBHOOK_BYPASS_TOKEN
  const isSignatureValid =
    c.env.AFDIAN_PUBLIC_KEY && (await verifyAfdianSignature(c.env.AFDIAN_PUBLIC_KEY, payload, sign))

  if (!isBypassed && !isSignatureValid) {
    return c.json({ ec: 403, em: 'Invalid signature' })
  }

  // 3. 僅處理成功的 order 類型事件
  if (payload?.ec !== 200 || payload?.data?.type !== 'order' || order?.status !== 2) {
    return c.json({ ec: 200, em: 'Ignored non-order or unpaid' })
  }

  // 4. 加值會員時數與訂單記錄
  return processAfdianOrder(c, c.env.DB, payload)
}
