import { createErrorResponse } from './utils.js'

/**
 * Handles fetching series prices from Yuyu-tei.
 * Fetches all pages, combines them, compresses the result, and caches in KV.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetSeriesPrices = async (c) => {
  try {
    const seriesId = c.req.param('seriesId')
    const yytUrl = c.req.query('url')

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

    // 1. Check KV cache
    const cachedData = await c.env.DAILY_SERIES_PRICE_KV.get(seriesId, 'arrayBuffer')
    if (cachedData) {
      return c.body(cachedData, 200, {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'gzip',
      })
    }

    // 2. Fetch the first page to get pagination info
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': yytUrl,
    }

    const firstPageRes = await fetch(yytUrl, { headers })
    if (!firstPageRes.ok) {
      return createErrorResponse(c, 502, '無法從 Yuyu-tei 獲取數據')
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

    // 3. Fetch subsequent pages if any
    if (maxPage > 1) {
      const fetchPromises = []
      for (let p = 2; p <= maxPage; p++) {
        const pageUrl = `${yytUrl}&page=${p}`
        fetchPromises.push(fetch(pageUrl, { headers }).then((res) => (res.ok ? res.text() : null)))
      }
      const otherPages = await Promise.all(fetchPromises)
      otherPages.forEach((html) => {
        if (html) htmls.push(html)
      })
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

    // 5. Store in KV with 3 days TTL
    await c.env.DAILY_SERIES_PRICE_KV.put(seriesId, compressedArrayBuffer, {
      expirationTtl: 259200,
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
