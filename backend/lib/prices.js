import { verify } from 'hono/jwt'
import { createErrorResponse } from './utils.js'
import { decompressFromEncodedURIComponent } from 'lz-string'

/**
 * Handles fetching series prices from Yuyu-tei.
 * Fetches all pages, combines them, compresses the result, and caches in KV.
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
    const ttl = isPremium ? 3 * 60 * 60 : 7 * 24 * 60 * 60 // 3 hour vs 7 days

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

    // 2. Fetch the first page to get pagination info
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

    const firstPageRes = await fetch(yytUrl, { headers })
    if (!firstPageRes.ok) {
      return createErrorResponse(c, 502, '无法从 Yuyu-tei 获取数据')
    }
    const firstPageHtml = await firstPageRes.text()

    // Find max page from pagination
    // Example: <li class="page-item"> <a ... page=3">3</a></li>
    // Or simpler: find all page=X and take the max
    const pageMatches = firstPageHtml.match(/page=(\d+)/g)
    let maxPage = 1
    if (pageMatches) {
      const pages = pageMatches.map((m) => parseInt(m.match(/\d+/)[0]))
      maxPage = Math.max(...pages)
    }

    const htmls = [firstPageHtml]

    // 3. Fetch subsequent pages if any sequentially with delay
    if (maxPage > 1) {
      for (let p = 2; p <= maxPage; p++) {
        const pageUrl = `${yytUrl}&page=${p}`
        try {
          const res = await fetch(pageUrl, {
            headers,
          })
          if (res.ok) {
            const html = await res.text()
            htmls.push(html)
          } else {
            console.error(`Failed to fetch page ${p}: ${res.status} ${res.statusText}`)
            return createErrorResponse(c, 502, '无法从 Yuyu-tei 获取数据')
          }
        } catch (err) {
          console.error(`Error fetching page ${p}:`, err)
          return createErrorResponse(c, 502, '无法从 Yuyu-tei 获取数据')
        }
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
