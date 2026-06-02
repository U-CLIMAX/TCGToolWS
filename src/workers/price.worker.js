import { expose } from 'comlink'
import { Parser } from 'htmlparser2'

const priceRegex = /[,円\s]/g

const priceProcessor = {
  /**
   * Parses multiple HTML strings to extract card prices.
   * @param {string[]} htmls - Array of HTML strings.
   * @returns {object} Map of card numbers to prices.
   */
  parsePrices(htmls) {
    console.time('parsePrices Worker')
    const prices = {}
    const seenCount = {}

    let currentCardId = null
    let isIdSpan = false
    let isPriceStrong = false

    const parser = new Parser({
      onopentag(name, attribs) {
        const className = attribs.class
        if (!className) return

        // Look for <span class="d-block border border-dark p-1 w-100 text-center my-2">DC/WE30-08SSP</span>
        if (
          name === 'span' &&
          className.includes('border-dark') &&
          className.includes('text-center')
        ) {
          isIdSpan = true
        }
        // Look for <strong class="d-block text-end ">6,980 円</strong>
        else if (name === 'strong' && className.includes('text-end')) {
          isPriceStrong = true
        }
      },
      ontext(text) {
        if (isIdSpan) {
          currentCardId = text.trim()
        } else if (isPriceStrong && currentCardId) {
          // Extract number from "6,980 円" or "6980円"
          const priceValue = text.replace(priceRegex, '')
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
      },
      onclosetag(name) {
        if (name === 'span') isIdSpan = false
        else if (name === 'strong') isPriceStrong = false
      },
    })

    for (let i = 0; i < htmls.length; i++) {
      parser.write(htmls[i])
    }
    parser.end()

    console.timeEnd('parsePrices Worker')
    return prices
  },
}

expose(priceProcessor)
