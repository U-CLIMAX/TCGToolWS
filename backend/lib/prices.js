import { verify } from 'hono/jwt'
import { createErrorResponse } from './utils.js'
import { decompressFromEncodedURIComponent } from 'lz-string'
import { parseTokens, fetchPageWithFallback } from '../services/scraper.js'

/**
 * Fast non-cryptographic string hash (32-bit FNV-1a)
 * @param {string} str - String to hash.
 * @returns {string} Base36 encoded hash string.
 */
const getFastHash = (str) => {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

/**
 * Handles fetching series prices from Yuyu-tei.
 * Fetches all pages with max 3 concurrent requests, compresses, and caches in KV.
 * @param {AppContext} c - Hono context object.
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

    const urlHash = getFastHash(yytUrl)
    const kvKey = isPremium ? `premium:${seriesId}:${urlHash}` : `${seriesId}:${urlHash}`
    const ttl = isPremium ? 3 * 60 * 60 : 7 * 24 * 60 * 60 // 3 hours vs 7 days

    const cacheControl = isPremium
      ? 'private, no-cache, must-revalidate'
      : 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600'

    // 1. Check KV cache
    const cachedData = await c.env.DAILY_SERIES_PRICE_KV.get(kvKey, 'arrayBuffer')
    if (cachedData) {
      return c.body(cachedData, 200, {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'gzip',
        'Cache-Control': cacheControl,
        'Vary': 'Authorization, Accept-Encoding',
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
    const isProd = import.meta.env.PROD
    const firstPageRes = await fetchPageWithFallback(yytUrl, { headers }, scraperApiTokens, isProd)
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
        const res = await fetchPageWithFallback(pageUrl, { headers }, scraperApiTokens, isProd)
        if (res.ok) {
          const html = await res.text()
          htmls[page - 1] = html
        }
      })
      await Promise.all(pagePromises)

      for (let i = 1; i < maxPage; i++) {
        if (!htmls[i]) return createErrorResponse(c, 502, '无法从 Yuyu-tei 获取数据')
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
      'Cache-Control': cacheControl,
      'Vary': 'Authorization, Accept-Encoding',
    })
  } catch (error) {
    console.error('Error fetching series prices:', error)
    return createErrorResponse(c, 500, '服務器內部錯誤')
  }
}
