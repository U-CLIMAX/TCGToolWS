import { Document, Charset } from 'flexsearch'
import { expose } from 'comlink'

const toZero = (val) => (val === '-' ? 0 : +val)

let allCards = []
let keywordResultsCache = null
let searchIndex = null

const createNewIndex = () => {
  return new Document({
    tokenize: 'forward',
    encoder: Charset.CJK,
    document: {
      id: 'index',
      index: ['name', 'effect', 'id'],
    },
  })
}

// Fallback: 舊的客戶端索引建立邏輯 (僅在沒有預先生成的索引檔時使用)
const addAllToIndex = (cards, index) => {
  console.log('⚠️ No pre-built index found. Building index on client side (this may be slow)...')
  cards.forEach((card, idx) => {
    index.add({
      index: idx,
      name: card.name || '',
      effect: card.effect || '',
      id: card.id || '',
    })
  })
}

const CardFilterService = {
  /**
   * 初始化服務，接收全部卡片資料
   * @param {Array} cards - 所有的卡片資料
   * @param {object} options - 初始化選項
   * @param {string} options.version - 版本號
   * @param {string} options.game - 遊戲類型 (ws/wsr)
   * @param {object} options.indexFiles - 預先建立的索引檔案對照表 { name: 'file.json', ... }
   */
  init: async (cards, options = {}) => {
    const { version, game, indexFiles } = options
    allCards = cards
    keywordResultsCache = null
    searchIndex = createNewIndex()

    // 載入預先建立的索引
    if (indexFiles && Object.keys(indexFiles).length > 0) {
      console.log(`Initializing FlexSearch for ${game} (v${version}) with pre-built indexes...`)
      console.time('Index Loading')

      try {
        const loadPromises = Object.entries(indexFiles).map(async ([key, filename]) => {
          const res = await fetch(`/${filename}`)
          if (!res.ok) throw new Error(`Failed to fetch index file: ${filename}`)

          const data = await res.json()
          searchIndex.import(key, data)
        })

        await Promise.all(loadPromises)
        console.timeEnd('Index Loading')
        console.log(`✅ FlexSearch is ready for ${allCards.length} cards (Loaded from Pre-built).`)
        return
      } catch (e) {
        console.error(
          '❌ Error loading pre-built indexes, falling back to client-side indexing:',
          e
        )
      }
    }

    // 若無 indexFiles 或下載失敗，則在前端建立
    console.time('Client-side Index Creation')
    addAllToIndex(allCards, searchIndex)
    console.timeEnd('Client-side Index Creation')
    console.log(`FlexSearch is ready for ${allCards.length} cards (Client-side built).`)
  },

  /**
   * 根據關鍵字搜尋卡片，並將結果暫存起來
   * @param {string} keyword - 用於搜尋的關鍵字
   * @param {string} searchMode - 搜尋模式 ('fuzzy' 或 'precise')
   */
  searchByKeyword: (keyword, searchMode = 'precise') => {
    if (!keyword) {
      keywordResultsCache = allCards
      return
    }

    if (keyword.length >= 2) {
      console.log(
        `Searching for "${keyword}" with mode "${searchMode}" in ${allCards.length} items...`
      )
      console.time('search time')

      // FlexSearch 搜索
      const searchResults = searchIndex.search(keyword, { limit: Infinity })

      // 收集所有匹配索引
      const matchedIndices = new Set()
      searchResults.forEach((fieldResult) => {
        if (fieldResult && fieldResult.result) {
          fieldResult.result.forEach((idx) => matchedIndices.add(idx))
        }
      })

      // 取出卡片物件
      let results = Array.from(matchedIndices).map((idx) => allCards[idx])

      // precise 模式下用 includes 過濾
      if (searchMode === 'precise') {
        const lowerKeyword = keyword.toLowerCase()
        results = results.filter(
          (card) =>
            (card.name && card.name.toLowerCase().includes(lowerKeyword)) ||
            (card.id && card.id.toLowerCase().includes(lowerKeyword)) ||
            (card.effect && card.effect.toLowerCase().includes(lowerKeyword))
        )
      }

      // 精確匹配排前面
      results.sort((a, b) => {
        const aExact = a.name === keyword || a.id === keyword || a.effect.includes(keyword)
        const bExact = b.name === keyword || b.id === keyword || b.effect.includes(keyword)
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        return 0
      })

      console.timeEnd('search time')
      console.log(`Search found ${matchedIndices.size} potential matches.`)

      keywordResultsCache = results
    } else {
      keywordResultsCache = []
    }
  },

  /**
   * 根據屬性篩選已透過關鍵字搜尋的結果
   * @param {object} filters - 篩選條件物件
   * @returns {Array} 篩選後的卡片陣列
   */
  filterByAttributes: (filters) => {
    let results = keywordResultsCache
    if (!results) results = allCards // Keyword search results cache is empty. Filtering all cards.

    const mappedLevels =
      filters.selectedLevels.length > 0 ? new Set(filters.selectedLevels.map(toZero)) : null
    const mappedSoul =
      filters.selectedSoul.length > 0 ? new Set(filters.selectedSoul.map(toZero)) : null

    return results.filter((card) => {
      const cardCost = card.cost === '-' ? 0 : Number(card.cost)

      if (filters.showUniqueCards && !card.isLowestRarity) {
        return false
      }
      if (filters.selectedCardTypes.length > 0 && !filters.selectedCardTypes.includes(card.type))
        return false
      if (filters.selectedColors.length > 0 && !filters.selectedColors.includes(card.color))
        return false
      if (filters.selectedProductName && card.product_name !== filters.selectedProductName)
        return false
      if (
        filters.selectedTraits.length > 0 &&
        !filters.selectedTraits.every((trait) => card.trait && card.trait.includes(trait))
      )
        return false
      if (mappedLevels && !mappedLevels.has(toZero(card.level))) return false
      if (filters.selectedRarities.length > 0 && !filters.selectedRarities.includes(card.rarity))
        return false
      if (cardCost < filters.selectedCostRange[0] || cardCost > filters.selectedCostRange[1])
        return false
      if (card.power < filters.selectedPowerRange[0] || card.power > filters.selectedPowerRange[1])
        return false
      if (filters.showTriggerSoul && (!card.trigger_soul_count || card.trigger_soul_count < 1))
        return false
      if (mappedSoul && !mappedSoul.has(toZero(card.soul))) return false
      return true
    })
  },
}

expose(CardFilterService)
