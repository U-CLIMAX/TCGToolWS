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
 * Fetch via ScraperAPI, trying each token until one succeeds.
 * @param {string} url
 * @param {string[]} tokens
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response|null>} null if all tokens failed
 */
const fetchWithScraperApi = async (url, tokens, options = {}) => {
  const countries = ['jp', 'hk', 'sg', 'tw']
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
 * Fetch a page with fallback chain: direct → ScraperAPI
 * @param {string} url
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {string[]} scraperApiTokens
 * @param {boolean} isProd
 * @returns {Promise<Response>}
 */
export const fetchPageWithFallback = async (url, options, scraperApiTokens, isProd = true) => {
  // 1. Try direct fetch first
  const res = await fetch(url, options)
  if (res.ok) return res

  console.warn(`Direct fetch blocked (${res.status}), falling back to ScraperAPI...`)

  if (!isProd) return res

  // 2. Try ScraperAPI
  if (scraperApiTokens.length > 0) {
    const scraperApiRes = await fetchWithScraperApi(url, scraperApiTokens, options)
    if (scraperApiRes) return scraperApiRes
    console.warn('All ScraperAPI tokens failed.')
  }

  // 3. All failed, return original failed response
  return res
}
