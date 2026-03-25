/**
 * Utility: Decode Base64 string to ArrayBuffer
 * @param {string} b64 - Base64 encoded string.
 * @returns {ArrayBuffer}
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
 * Utility: Import Afdian Public Key for RSA verification
 * @param {string} pemKey - RSA public key in PEM format.
 * @returns {Promise<CryptoKey>}
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
 * Verifies the digital signature from Afdian Webhook payload.
 * @param {string} publicKeyPem - RSA public key from environment.
 * @param {object} payload - Full webhook payload.
 * @param {string} sign - Signature string from payload.
 * @returns {Promise<boolean>} - True if signature is valid.
 */
export const verifyAfdianSignature = async (publicKeyPem, payload, sign) => {
  if (!publicKeyPem) {
    console.error('AFDIAN_PUBLIC_KEY is not set in environment variables.')
    return false
  }

  try {
    const order = payload.data.order
    // Construct signature string according to Afdian documentation
    const signStr = order.out_trade_no + order.user_id + order.plan_id + order.total_amount

    const key = await importAfdianPublicKey(publicKeyPem)
    const signatureBuffer = base64ToArrayBuffer(sign)
    const dataBuffer = new TextEncoder().encode(signStr)

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
    console.error('Afdian signature verification failed:', error)
    return false
  }
}
