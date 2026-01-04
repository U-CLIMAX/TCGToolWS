/**
 * 輔助函數：將 Base64 字符串解碼為 ArrayBuffer
 */
const base64ToArrayBuffer = (b64) => {
  const binaryStr = atob(b64)
  const len = binaryStr.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 輔助函數：導入愛發電的公鑰
 */
const importAfdianPublicKey = async (pemKey) => {
  const pemHeader = '-----BEGIN PUBLIC KEY-----'
  const pemFooter = '-----END PUBLIC KEY-----'
  const pemContents = pemKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '')

  const binaryDer = base64ToArrayBuffer(pemContents)

  return crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    true,
    ['verify']
  )
}

/**
 * 核心：驗證愛發電簽名 (導出)
 * @param {string} publicKeyPem - 來自 c.env.AFDIAN_PUBLIC_KEY 的公鑰
 * @param {object} payload - 完整的 Webhook payload
 * @param {string} sign - 來自 payload 的 'sign' 字段
 * @returns {Promise<boolean>} - 簽名是否有效
 */
export const verifyAfdianSignature = async (publicKeyPem, payload, sign) => {
  if (!publicKeyPem) {
    console.error('AFDIAN_PUBLIC_KEY is not set in environment variables.')
    return false
  }

  try {
    const order = payload.data.order
    // 構造簽名字符串
    const signStr = order.out_trade_no + order.user_id + order.plan_id + order.total_amount

    // 準備數據
    const key = await importAfdianPublicKey(publicKeyPem)
    const signatureBuffer = base64ToArrayBuffer(sign)
    const dataBuffer = new TextEncoder().encode(signStr)

    // 驗證
    const isValid = await crypto.subtle.verify(
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      key,
      signatureBuffer,
      dataBuffer
    )

    return isValid
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}
