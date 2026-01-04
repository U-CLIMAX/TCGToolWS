/**
 * 建立一個標準化的 JSON 錯誤回應。
 * @param {object} c - Hono context object.
 * @param {number} status - HTTP 狀態碼。
 * @param {string} message - 錯誤訊息。
 * @returns {Response}
 */
export const createErrorResponse = (c, status, message) => {
  return c.json({ error: message }, status)
}
