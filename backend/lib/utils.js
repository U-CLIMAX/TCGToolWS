/**
 * Create a standardized JSON error response.
 * @param {object} c - Hono context object.
 * @param {number} status - HTTP status code.
 * @param {string} message - Error message in Simplified Chinese.
 * @returns {Response}
 */
export const createErrorResponse = (c, status, message) => {
  return c.json({ error: message }, status)
}
