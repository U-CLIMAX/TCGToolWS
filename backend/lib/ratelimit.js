import { HTTPException } from 'hono/http-exception'

/**
 * Creates a Hono middleware for rate limiting using Cloudflare Workers RateLimiter.
 *
 * @param {object} options - The options for the rate limiter.
 * @param {import('@cloudflare/workers-types').RateLimiter} options.limiter - The rate limiter binding instance.
 * @param {(c: import('hono').Context) => Promise<string|null>|string|null} options.keyExtractor - Function to extract the unique key.
 * @returns {import('hono').MiddlewareHandler}
 */
export const createRateLimiter = ({ limiter, keyExtractor }) => {
  return async (c, next) => {
    // Skip if limiter is not available (e.g., local development without binding)
    if (!limiter) {
      console.warn('Rate limiter binding is not available. Bypassing rate limit.')
      return next()
    }

    const key = await keyExtractor(c)

    // Skip if key could not be extracted
    if (!key) {
      console.warn('Rate limit key could not be extracted. Bypassing rate limit.')
      return next()
    }

    try {
      const { success } = await limiter.limit({ key })
      if (!success) {
        throw new HTTPException(429, { message: '请求过于频繁，请稍后再试' })
      }
    } catch (e) {
      if (e instanceof HTTPException) {
        throw e
      }
      console.error('Error applying rate limit:', e)
      // Fail open to avoid blocking legitimate users on internal errors
      return next()
    }

    await next()
  }
}

// --- Key Extractors ---

/**
 * Extracts the IP address from request headers.
 * @param {import('hono').Context} c
 * @returns {string}
 */
export const ipKeyExtractor = (c) => {
  return c.req.header('cf-connecting-ip') || 'unknown-ip'
}

/**
 * Extracts the email address from JSON body for per-user rate limiting.
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
 * Extracts user ID from JWT payload.
 * @param {import('hono').Context} c
 * @returns {string|null}
 */
export const userIdFromJwtKeyExtractor = (c) => {
  const payload = c.get('jwtPayload')
  return payload?.sub || null
}
