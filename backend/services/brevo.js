/**
 * Sends a verification code via email using Brevo SMTP API.
 * @param {string} toEmail - Recipient email address.
 * @param {string} verificationCode - 6-digit verification code.
 * @param {string} apiKey - Brevo API key.
 * @returns {Promise<void>}
 */
export const sendVerificationEmail = async (toEmail, verificationCode, apiKey) => {
  const SENDER_NAME = 'Uclimax TCGTool'
  const SENDER_EMAIL = 'noreply@uclimax.top'

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: SENDER_NAME,
        email: SENDER_EMAIL,
      },
      to: [
        {
          email: toEmail,
        },
      ],
      subject: `您的验证码是 ${verificationCode}`,
      htmlContent: `<html><body><p>您好，</p><p>您的账号验证码是：<b>${verificationCode}</b></p><p>此验证码将在 10 分钟后失效。</p></body></html>`,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Brevo API Error (Verification):', response.status, errorData)
    throw new Error('邮件发送失败，请稍后重试')
  }
}

/**
 * Sends a password reset link via email.
 * @param {string} toEmail - Recipient email address.
 * @param {string} resetToken - Secure token for password reset.
 * @param {string} apiKey - Brevo API key.
 * @param {string} frontendUrl - Base URL of the frontend application.
 * @returns {Promise<void>}
 */
export const sendPasswordResetEmail = async (toEmail, resetToken, apiKey, frontendUrl) => {
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`
  const SENDER_NAME = 'Uclimax TCGTool'
  const SENDER_EMAIL = 'noreply@uclimax.top'

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: toEmail }],
      subject: '重置您的 TCGTool 账户密码',
      htmlContent: `
        <html>
          <body>
            <p>您好，</p>
            <p>我们收到了一个重置您账户密码的请求。请点击下面的链接来设置新密码：</p>
            <p><a href="${resetLink}" target="_blank">点击这里重置密码</a></p>
            <p>如果您没有请求重置密码，请忽略此邮件。</p>
            <p>此链接将在 1 小时后失效。</p>
          </body>
        </html>`,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Brevo API Error (Password Reset):', response.status, errorData)
    throw new Error('密码重置邮件发送失败，请稍后重试')
  }
}
