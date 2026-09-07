import { expose } from 'comlink'

const priceRegex = /[,円\s]/g

const TAG_REGEX =
  /<span\b[^>]*class=["'](?=[^"']*\bborder-dark\b)(?=[^"']*\btext-center\b)[^"']*["'][^>]*>([^<]+)<\/span>|<strong\b[^>]*class=["'][^"']*\btext-end\b[^"']*["'][^>]*>([^<]+)<\/strong>/gi

/**
 * Decompresses Gzip buffer using native DecompressionStream or pako fallback.
 * @param {ArrayBuffer|Uint8Array} buffer - Compressed data buffer.
 * @returns {Promise<string>} Decompressed JSON string.
 */
const decompressBuffer = async (buffer) => {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('gzip')
      const stream = new Response(buffer).body.pipeThrough(ds)
      return await new Response(stream).text()
    } catch (e) {
      console.warn('[PriceWorker] DecompressionStream failed, falling back to pako:', e)
    }
  }
  const { ungzip } = await import('pako')
  const uint8 =
    buffer instanceof Uint8Array
      ? buffer
      : ArrayBuffer.isView(buffer)
        ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        : new Uint8Array(buffer)
  return ungzip(uint8, { toText: true })
}

const priceProcessor = {
  /**
   * Decompresses Gzip buffer and parses card prices from JSON HTML array.
   * @param {ArrayBuffer|Uint8Array} compressedBuffer - Gzip compressed JSON array buffer.
   * @returns {Promise<object>} Map of card numbers to prices.
   */
  async parsePricesFromBuffer(compressedBuffer) {
    const jsonText = await decompressBuffer(compressedBuffer)
    const htmls = JSON.parse(jsonText)
    return this.parsePrices(htmls)
  },

  /**
   * Parses multiple HTML strings to extract card prices.
   * @param {string[]} htmls - Array of HTML strings.
   * @returns {object} Map of card numbers to prices.
   */
  parsePrices(htmls) {
    if (!Array.isArray(htmls)) return {}

    const prices = {}
    const seenCount = {}
    let currentCardId = null

    for (let i = 0; i < htmls.length; i++) {
      const html = htmls[i]
      if (!html) continue

      const matches = html.matchAll(TAG_REGEX)
      for (const match of matches) {
        const [, cardId, priceText] = match
        if (cardId !== undefined) {
          currentCardId = cardId.trim()
        } else if (priceText !== undefined && currentCardId) {
          const priceValue = priceText.replace(priceRegex, '')
          const priceNum = parseInt(priceValue, 10)

          if (!isNaN(priceNum)) {
            const key = currentCardId
            const count = (seenCount[key] || 0) + 1
            seenCount[key] = count

            if (count === 1) {
              // 第一次
              prices[key] = priceNum
            } else if (count === 2) {
              // 第二次：把第一次改名
              prices[key + '_'] = prices[key]
              // 再寫入新的第二筆
              prices[key] = priceNum
            }

            // 第三次以上：直接忽略
            currentCardId = null
          }
        }
      }
    }

    return prices
  },
}

expose(priceProcessor)
