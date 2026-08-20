/**
 * Create a standardized JSON error response.
 * @param {AppContext} c - Hono context object.
 * @param {number} status - HTTP status code.
 * @param {string} message - Error message in Simplified Chinese.
 * @returns {Response}
 */
export const createErrorResponse = (c, status, message) => {
  return c.json({ error: message }, status)
}

/**
 * Middleware: Set public caching headers with SWR support for anonymous read-only endpoints.
 * @param {object} [options]
 * @param {number} [options.maxAge=60] - Browser cache max age in seconds
 * @param {number} [options.sMaxAge=300] - Shared CDN edge cache max age in seconds
 * @param {number} [options.staleWhileRevalidate=600] - SWR window in seconds
 * @returns {AppMiddleware}
 */
export const publicCache = (options = {}) => {
  const { maxAge = 60, sMaxAge = 300, staleWhileRevalidate = 600 } = options
  return async (c, next) => {
    await next()
    if (c.req.method === 'GET' && c.res.status === 200) {
      c.header(
        'Cache-Control',
        `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
      )
      c.header('Vary', 'Accept-Encoding')
    }
  }
}

/**
 * Middleware: Enforce strictly private, non-cached headers with Vary: Authorization for sensitive/authenticated endpoints.
 * Prevents CDN and cross-user cache pollution.
 * @type {AppMiddleware}
 */
export const privateNoCache = async (c, next) => {
  await next()
  c.header('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0')
  c.header('Pragma', 'no-cache')
  c.header('Vary', 'Authorization')
}
