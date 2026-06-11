import { verify } from 'hono/jwt'
import { createErrorResponse } from './utils.js'
import { decompressFromEncodedURIComponent } from 'lz-string'

/**
 * Parse comma-separated tokens from env string.
 * @param {string|undefined} envValue
 * @returns {string[]}
 */
const parseTokens = (envValue) => {
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
 * @returns {Promise<Response|null>} null if all tokens failed
 */
const fetchWithScraperApi = async (url, tokens) => {
  const countries = ['jp', 'hk', 'sg', 'tw']
  for (const token of tokens) {
    const countryCode = countries[Math.floor(Math.random() * countries.length)]
    const scraperUrl = `https://api.scraperapi.com/?api_key=${token}&url=${encodeURIComponent(url)}&country_code=${countryCode}`
    try {
      const res = await fetch(scraperUrl)
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
 * @param {object} headers
 * @param {string[]} scraperApiTokens
 * @returns {Promise<Response>}
 */
const fetchPage = async (url, headers, scraperApiTokens) => {
  const isProd = import.meta.env.PROD

  // 1. Try direct fetch first
  const res = await fetch(url, { headers })
  if (res.ok) return res

  console.warn(`Direct fetch blocked (${res.status}), falling back to ScraperAPI...`)

  if (!isProd) return res

  // 2. Try ScraperAPI
  if (scraperApiTokens.length > 0) {
    const scraperApiRes = await fetchWithScraperApi(url, scraperApiTokens)
    if (scraperApiRes) return scraperApiRes
    console.warn('All ScraperAPI tokens failed.')
  }

  // 3. All failed, return original failed response
  return res
}

/**
 * Handles fetching series prices from Yuyu-tei.
 * Fetches all pages with max 3 concurrent requests, compresses, and caches in KV.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetSeriesPrices = async (c) => {
  try {
    const seriesId = c.req.param('seriesId')
    const yytUrl = decompressFromEncodedURIComponent(c.req.query('ref'))

    if (!seriesId || !yytUrl) {
      return createErrorResponse(c, 400, '缺少 seriesId 或 url')
    }

    // SSRF Protection: Validate URL domain and protocol
    try {
      const url = new URL(yytUrl)
      if (url.protocol !== 'https:' || !url.hostname.endsWith('yuyu-tei.jp')) {
        return createErrorResponse(c, 400, '无效的 url')
      }
    } catch {
      return createErrorResponse(c, 400, '无效的 url')
    }

    // 0. Determine user role from optional JWT
    let isPremium = false
    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
        if (payload && payload.role !== 0) {
          isPremium = true
        }
      } catch {
        // Ignore invalid tokens for this optional check
      }
    }

    const kvKey = isPremium ? `premium:${seriesId}` : seriesId
    const ttl = isPremium ? 3 * 60 * 60 : 7 * 24 * 60 * 60 // 3 hours vs 7 days

    // 1. Check KV cache
    const cachedData = await c.env.DAILY_SERIES_PRICE_KV.get(kvKey, 'arrayBuffer')
    if (cachedData) {
      return c.body(cachedData, 200, {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'gzip',
      })
    }

    const userAgent =
      c.req.header('UA') ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

    const headers = {
      'User-Agent': userAgent,
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': yytUrl,
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
    }

    const scraperApiTokens = parseTokens(c.env.SCRAPER_API_KEY)

    // 2. Fetch the first page to get pagination info
    const firstPageRes = await fetchPage(yytUrl, headers, scraperApiTokens)
    if (!firstPageRes.ok) {
      return createErrorResponse(c, 502, '无法从 Yuyu-tei 获取数据')
    }
    const firstPageHtml = await firstPageRes.text()

    // Find max page from pagination
    const pageMatches = firstPageHtml.match(/page=(\d+)/g)
    let maxPage = 1
    if (pageMatches) {
      const pages = pageMatches.map((m) => parseInt(m.match(/\d+/)[0]))
      maxPage = Math.max(...pages)
    }

    const htmls = new Array(maxPage)
    htmls[0] = firstPageHtml

    // 3. Fetch subsequent pages
    if (maxPage > 1) {
      const pagePromises = Array.from({ length: maxPage - 1 }, async (_, i) => {
        const page = i + 2
        const pageUrl = `${yytUrl}&page=${page}`
        const res = await fetchPage(pageUrl, headers, scraperApiTokens)
        return {
          index: i + 1,
          html: res.ok ? await res.text() : null,
        }
      })

      const results = await Promise.all(pagePromises)

      for (const { index, html } of results) {
        if (!html) return createErrorResponse(c, 502, '无法从 Yuyu-tei 获取数据')
        htmls[index] = html
      }
    }

    // 4. Compress the data
    const jsonString = JSON.stringify(htmls)
    const encoder = new TextEncoder()
    const data = encoder.encode(jsonString)

    const compressionStream = new CompressionStream('gzip')
    const writer = compressionStream.writable.getWriter()
    writer.write(data)
    writer.close()

    const compressedResponse = new Response(compressionStream.readable)
    const compressedArrayBuffer = await compressedResponse.arrayBuffer()

    // 5. Store in KV
    await c.env.DAILY_SERIES_PRICE_KV.put(kvKey, compressedArrayBuffer, {
      expirationTtl: ttl,
    })

    return c.body(compressedArrayBuffer, 200, {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'gzip',
    })
  } catch (error) {
    console.error('Error fetching series prices:', error)
    return createErrorResponse(c, 500, '服務器內部錯誤')
  }
}
