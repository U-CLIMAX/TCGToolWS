import { HTTPException } from 'hono/http-exception'

/**
 * Creates a Hono middleware for rate limiting.
 *
 * @param {object} options - The options for the rate limiter.
 * @param {import('@cloudflare/workers-types').RateLimiter} options.limiter - The rate limiter binding instance.
 * @param {(c: import('hono').Context) => Promise<string|null>|string|null} options.keyExtractor - A function to extract the unique key for rate limiting from the request context.
 * @returns {import('hono').MiddlewareHandler}
 */
export const createRateLimiter = ({ limiter, keyExtractor }) => {
  return async (c, next) => {
    // If the limiter binding is not available (e.g., in certain test environments),
    // log a warning and bypass the rate limit.
    if (!limiter) {
      console.warn('Rate limiter binding is not available. Bypassing rate limit.')
      return next()
    }

    const key = await keyExtractor(c)

    if (!key) {
      console.warn('Rate limit key could not be extracted. Bypassing rate limit.')
      return next()
    }

    try {
      const { success } = await limiter.limit({ key })
      if (!success) {
        throw new HTTPException(429, { message: 'Too Many Requests' })
      }
    } catch (e) {
      if (e instanceof HTTPException) {
        throw e
      }
      console.error('Error applying rate limit:', e)
      // Fail open: If the limiter fails for reasons other than exceeding the limit, allow the request.
      return next()
    }

    await next()
  }
}

// --- Key Extractors ---

/**
 * Extracts the IP address from the request headers.
 * @param {import('hono').Context} c
 * @returns {string}
 */
export const ipKeyExtractor = (c) => {
  return c.req.header('cf-connecting-ip') || 'unknown-ip'
}

/**
 * Extracts the email from the JSON body of the request.
 * @param {import('hono').Context} c
 * @returns {Promise<string|null>}
 */
export const emailBodyKeyExtractor = async (c) => {
  try {
    const body = await c.req.json()
    return body?.email || null
  } catch (e) {
    console.error('Failed to parse JSON body for email key extraction:', e)
    return null
  }
}

/**
 * Extracts the user ID from the JWT payload set by the auth middleware.
 * @param {import('hono').Context} c
 * @returns {string|null}
 */
export const userIdFromJwtKeyExtractor = (c) => {
  const payload = c.get('jwtPayload')
  return payload?.sub || null
}
