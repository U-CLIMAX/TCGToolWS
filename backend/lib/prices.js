import { verify } from 'hono/jwt'
import { createErrorResponse } from './utils.js'
import { seriesYytMap } from '../maps/series-yyt-map.js'
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
 * Precomputed hash map for all series URLs
 * @type {Record<string, string>}
 */
const seriesHashMap = Object.fromEntries(
  Object.entries(seriesYytMap).map(([id, url]) => [id, getFastHash(url)])
)

/**
 * Precomputed Gzip-compressed empty JSON array "[]" (22 bytes)
 * @type {Uint8Array}
 */
const EMPTY_GZIP_BUFFER = new Uint8Array([
  31, 139, 8, 0, 0, 0, 0, 0, 0, 3, 139, 138, 5, 0, 149, 155, 178, 12, 2, 0, 0, 0,
])

/**
 * Handles fetching all series URL hashes.
 * @param {AppContext} c - Hono context object.
 * @returns {Response}
 */
export const handleGetSeriesHashes = async (c) => {
  return c.json(seriesHashMap, 200, {
    'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600',
  })
}

/**
 * Handles fetching series prices from Yuyu-tei based on seriesId.
 * Looks up the series Yuyu-tei URL from backend seriesYytMap, fetches pages,
 * compresses, and caches in KV.
 * Returns empty array buffer (200 OK) if series has no price configuration.
 * @param {AppContext} c - Hono context object.
 * @returns {Promise<Response>}
 */
export const handleGetSeriesPrices = async (c) => {
  try {
    const seriesId = c.req.param('seriesId')

    if (!seriesId) {
      return createErrorResponse(c, 400, '缺少 seriesId')
    }

    const yytUrl = seriesYytMap[seriesId]
    // 若该系列无价格配置（例如非日版/无游游亭端点），正常返回空数据 200，不作为错误处理
    if (!yytUrl) {
      return c.body(EMPTY_GZIP_BUFFER, 200, {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'gzip',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        'X-URL-Hash': '',
      })
    }

    // SSRF Protection / Sanity check: Validate URL domain and protocol
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

    const urlHash = seriesHashMap[seriesId]
    const kvKey = isPremium ? `premium:${seriesId}:${urlHash}` : `${seriesId}:${urlHash}`
    const ttl = isPremium ? 3 * 60 * 60 : 24 * 60 * 60 // 3 hours vs 1 day

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
        'X-URL-Hash': urlHash,
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
      'X-URL-Hash': urlHash,
    })
  } catch (error) {
    console.error('Error fetching series prices:', error)
    return createErrorResponse(c, 500, '服務器內部錯誤')
  }
}
