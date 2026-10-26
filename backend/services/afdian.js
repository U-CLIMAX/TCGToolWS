import { processAfdianOrder } from '../lib/payments.js'
import { createAfdianResponse } from '../lib/utils.js'

const AFDIAN_TEST_USER_ID = 'adf397fe8374811eaacee52540025c377'
const AFDIAN_TEST_ORDER_NO = '202106232138371083454010626'

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
 * 愛發電 Webhook
 * @type {AppHandler}
 */
export const handleAfdianWebhook = async (c) => {
  let rawBody = ''
  let payload
  try {
    rawBody = await c.req.text()
    payload = JSON.parse(rawBody)
  } catch (err) {
    console.error('Afdian Webhook: Invalid JSON', err?.message)
    return createAfdianResponse(c, { ec: 400, em: 'Invalid JSON' })
  }

  const order = payload?.data?.order
  const sign = payload?.data?.sign

  console.log(
    `[Afdian Webhook] user: ${order?.user_id}, trade: ${order?.out_trade_no}, hasSign: ${Boolean(sign)}`
  )

  // 官方測試請求直接回傳 200
  if (
    order?.user_id === AFDIAN_TEST_USER_ID ||
    order?.out_trade_no === AFDIAN_TEST_ORDER_NO ||
    (!sign && order?.out_trade_no?.startsWith('20210623'))
  ) {
    console.log('[Afdian Webhook] Test ping OK')
    return createAfdianResponse(c, { ec: 200, em: '' })
  }

  // 簽名驗證
  const isBypassed = c.env.AFDIAN_WEBHOOK_BYPASS_TOKEN && sign === c.env.AFDIAN_WEBHOOK_BYPASS_TOKEN
  const isSignatureValid =
    c.env.AFDIAN_PUBLIC_KEY && (await verifyAfdianSignature(c.env.AFDIAN_PUBLIC_KEY, payload, sign))

  if (!isBypassed && !isSignatureValid) {
    console.warn('[Afdian Webhook] Invalid signature')
    return createAfdianResponse(c, { ec: 403, em: 'Invalid signature' })
  }

  // 僅處理已付款的訂單
  if (payload?.ec !== 200 || payload?.data?.type !== 'order' || order?.status !== 2) {
    return createAfdianResponse(c, { ec: 200, em: 'Ignored non-order or unpaid' })
  }

  // 處理會員儲值與訂單記錄
  return processAfdianOrder(c, c.env.DB, payload)
}
