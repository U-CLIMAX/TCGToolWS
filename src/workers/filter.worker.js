import { Document, Charset } from 'flexsearch'
import { expose } from 'comlink'
import { openDB, saveData, loadData } from '@/utils/db.js'

const dbName = 'FlexSearchCacheDB'
const storeName = 'flexsearch-indexes'

const toLevel = (level) => (level === '-' ? 0 : +level)

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

const addAllToIndex = (cards, index) => {
  // 將卡片加入索引
  cards.forEach((card, idx) => {
    index.add({
      index: idx, // 使用陣列索引作為 ID
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
   * @param {string} options.cacheKey - 索引緩存鍵
   */
  init: async (cards, options = {}) => {
    const { version, cacheKey } = options
    allCards = cards
    keywordResultsCache = null

    if (!cacheKey) {
      console.log('Cache key not provided, creating temporary index.')
      searchIndex = createNewIndex()
      addAllToIndex(allCards, searchIndex)
      console.log(`FlexSearch is ready for ${allCards.length} cards.`)
      return
    }

    console.log(`Initializing with cacheKey: ${cacheKey}, version: ${version}`)
    console.time('Index Initialization')

    let db
    try {
      db = await openDB(dbName, storeName, 'cacheKey')
      const stored = await loadData(db, storeName, cacheKey)

      if (stored && stored.version === version) {
        console.log('Found valid cached index. Importing...')
        console.time('Index Import')
        searchIndex = createNewIndex()
        // FlexSearch's import is synchronous in this context
        for (const key in stored.indexParts) {
          searchIndex.import(key, stored.indexParts[key])
        }
        console.timeEnd('Index Import')
      } else {
        console.log('No valid cached index found or version mismatch. Creating new index...')
        console.time('Index Creation')
        searchIndex = createNewIndex()
        addAllToIndex(allCards, searchIndex)
        console.timeEnd('Index Creation')

        console.log('Exporting and caching new index...')
        console.time('Index Export & Cache')
        const indexParts = {}
        // FlexSearch's export is synchronous and uses a callback
        searchIndex.export((key, data) => {
          indexParts[key] = data
        })
        await saveData(db, storeName, { cacheKey, version, indexParts })
        console.timeEnd('Index Export & Cache')
      }
    } catch (e) {
      console.error(
        'Error during index initialization with cache, falling back to temporary index:',
        e
      )
      searchIndex = createNewIndex()
      addAllToIndex(allCards, searchIndex)
    } finally {
      if (db) db.close()
      console.timeEnd('Index Initialization')
      console.log(`FlexSearch is ready for ${allCards.length} cards.`)
    }
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
      filters.selectedLevels.length > 0 ? new Set(filters.selectedLevels.map(toLevel)) : null
    const mappedSoul =
      filters.selectedSoul && filters.selectedSoul.length > 0
        ? new Set(filters.selectedSoul.map((s) => Number(s)))
        : null

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
      if (mappedLevels && !mappedLevels.has(toLevel(card.level))) return false
      if (filters.selectedRarities.length > 0 && !filters.selectedRarities.includes(card.rarity))
        return false
      if (cardCost < filters.selectedCostRange[0] || cardCost > filters.selectedCostRange[1])
        return false
      if (card.power < filters.selectedPowerRange[0] || card.power > filters.selectedPowerRange[1])
        return false
      if (filters.showTriggerSoul && (!card.trigger_soul_count || card.trigger_soul_count < 1))
        return false
      if (mappedSoul && !mappedSoul.has(Number(card.soul))) return false
      return true
    })
  },
}

expose(CardFilterService)
