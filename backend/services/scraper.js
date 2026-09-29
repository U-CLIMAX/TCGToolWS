/**
 * Non-blocking delay utility. Suspends V8 execution without consuming CPU time in Cloudflare Workers.
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Parse comma-separated tokens from env string.
 * @param {string|undefined} envValue
 * @returns {string[]}
 */
export const parseTokens = (envValue) => {
  if (!envValue) return []
  return envValue
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

/**
 * Creates standard modern Chrome browser headers with Client Hints.
 * @param {Record<string, string>} [customHeaders={}] - Additional or overriding headers.
 * @param {string} [cookie=''] - Optional cookie string to include.
 * @param {string} [userAgent=''] - Optional User-Agent string from client request.
 * @returns {Record<string, string>}
 */
export const createBrowserHeaders = (customHeaders = {}, cookie = '', userAgent = '') => {
  /** @type {Record<string, string>} */
  const baseHeaders = {
    'User-Agent':
      userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'ja-JP,ja;q=0.9,zh-TW;q=0.8,zh;q=0.7,en-US;q=0.6,en;q=0.5',
    'Sec-Ch-Ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    ...customHeaders,
  }

  if (cookie) {
    baseHeaders['Cookie'] = cookie
  }

  return baseHeaders
}

/**
 * Extracts and formats cookie string for subsequent requests from Set-Cookie header(s).
 * @param {string|string[]|null|undefined} setCookieHeader - Set-Cookie header value or array.
 * @returns {string} Formatted cookie header string (e.g. "key1=val1; key2=val2")
 */
export const extractCookies = (setCookieHeader) => {
  if (!setCookieHeader) return ''
  const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
  const cookieMap = new Map()

  for (const str of cookieStrings) {
    if (!str) continue
    const parts = str.split(/,(?=\s*[a-zA-Z0-9_-]+=[^;]+)/)
    for (const part of parts) {
      const firstPair = part.split(';')[0].trim()
      const equalIndex = firstPair.indexOf('=')
      if (equalIndex > 0) {
        const name = firstPair.slice(0, equalIndex).trim()
        const value = firstPair.slice(equalIndex + 1).trim()
        if (name && value) {
          cookieMap.set(name, `${name}=${value}`)
        }
      }
    }
  }

  return Array.from(cookieMap.values()).join('; ')
}

/**
 * Fetch via ScraperAPI, trying each token until one succeeds.
 * @param {string} url
 * @param {string[]} tokens
 * @param {RequestInit} [options={}] - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response|null>} null if all tokens failed
 */
export const fetchWithScraperApi = async (url, tokens, options = {}) => {
  const countries = ['jp', 'hk', 'tw', 'sg']
  const hasHeaders = options.headers && Object.keys(options.headers).length > 0

  for (const token of tokens) {
    const countryCode = countries[Math.floor(Math.random() * countries.length)]
    let scraperUrl = `https://api.scraperapi.com/?api_key=${token}&url=${encodeURIComponent(url)}&country_code=${countryCode}`

    if (hasHeaders) {
      scraperUrl += '&keep_headers=true'
    }

    try {
      const res = await fetch(scraperUrl, options)
      if (res.ok) return res
      console.warn(`ScraperAPI token failed (${res.status}), trying next...`)
    } catch (err) {
      console.warn(`ScraperAPI token error:`, err)
    }
  }
  return null
}

/**
 * Fetch a page with smart direct retry and fallback chain: direct (with retry) → ScraperAPI
 * @param {string} url
 * @param {RequestInit} [options={}] - Fetch options (method, headers, body, etc.)
 * @param {string[]} [scraperApiTokens=[]] - ScraperAPI tokens for fallback
 * @param {boolean} [isProd=true] - Production environment flag
 * @param {number} [maxDirectRetries=2] - Maximum number of direct retries on rate limit (429) or transient 5xx errors
 * @returns {Promise<Response>}
 */
export const fetchPageWithFallback = async (
  url,
  options = {},
  scraperApiTokens = [],
  isProd = true,
  maxDirectRetries = 2
) => {
  let lastResponse = null
  let lastError = null

  // 1. Try direct fetch with intelligent retry for transient rate limits or 5xx
  for (let attempt = 0; attempt <= maxDirectRetries; attempt++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) return res

      lastResponse = res

      // 403 Forbidden is a hard block (Cloudflare WAF / IP block); immediate ScraperAPI fallback without retry
      if (res.status === 403) {
        console.warn(`Direct fetch 403 Forbidden on ${url}, proceeding to ScraperAPI fallback...`)
        break
      }

      // If rate limited (429) or server error (500, 502, 503, 504), perform exponential backoff retry if attempts remain
      if (
        (res.status === 429 || (res.status >= 500 && res.status <= 504)) &&
        attempt < maxDirectRetries
      ) {
        const backoffMs = 500 * (attempt + 1) + Math.floor(Math.random() * 200)
        console.warn(
          `Direct fetch transient status (${res.status}) on attempt ${attempt + 1}, retrying in ${backoffMs}ms...`
        )
        await sleep(backoffMs)
        continue
      }

      // Other 4xx client errors or exhausted retries
      break
    } catch (err) {
      lastError = err
      console.warn(`Direct fetch network error on attempt ${attempt + 1}:`, err)
      if (attempt < maxDirectRetries) {
        const backoffMs = 500 * (attempt + 1) + Math.floor(Math.random() * 200)
        await sleep(backoffMs)
      }
    }
  }

  console.warn(
    `Direct fetch unsuccessful (${lastResponse?.status ?? lastError?.message}), falling back to ScraperAPI...`
  )

  if (!isProd) {
    if (lastResponse) return lastResponse
    throw lastError || new Error(`Direct fetch failed for ${url}`)
  }

  // 2. Try ScraperAPI fallback
  if (scraperApiTokens.length > 0) {
    const scraperApiRes = await fetchWithScraperApi(url, scraperApiTokens, options)
    if (scraperApiRes) return scraperApiRes
    console.warn('All ScraperAPI tokens failed.')
  }

  // 3. All attempts failed, return last response or throw
  if (lastResponse) return lastResponse
  throw lastError || new Error(`All fetch methods failed for ${url}`)
}
