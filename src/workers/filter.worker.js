import { Document, Charset } from 'flexsearch'
import { expose } from 'comlink'

const toZero = (val) => (val === '-' ? 0 : +val)

let allCards = []
const idToCardMap = new Map()
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
  for (let idx = 0; idx < cards.length; idx++) {
    const card = cards[idx]
    index.add({
      index: idx,
      name: card.name || '',
      effect: card.effect || '',
      id: card.id || '',
    })
  }
}

const NON_LOWEST_RARITIES = new Set(['AGR'])
const QUOTE_REGEX = /[「｢]([^」｣]+)[」｣]/g

const CardFilterService = {
  /**
   * Processes raw card data (flattening, linking, stats) without fetching.
   * @param {Array<{content: Object, cardIdPrefix: string}>} rawFiles - List of raw file contents
   * @returns {Promise<Object>} The processed cards and filter options
   */
  processRawData: async (rawFiles) => {
    const fetchedCards = []
    idToCardMap.clear()
    const productNamesSet = new Set()
    const traitsSet = new Set()
    const raritiesSet = new Set()
    const soulsSet = new Set()
    const levelsSet = new Set()
    let minCost = Infinity,
      maxCost = -Infinity,
      minPower = Infinity,
      maxPower = -Infinity

    if (!rawFiles || rawFiles.length === 0) {
      allCards = fetchedCards
      return {
        allCards: fetchedCards,
        productNames: [],
        traits: [],
        rarities: [],
        souls: [],
        levels: [],
        costRange: { min: 0, max: 0 },
        powerRange: { min: 0, max: 0 },
      }
    }

    // 1. 建立基礎索引 (名稱 -> baseIds, baseId -> 所有 card.id)
    const nameToBaseIds = new Map()
    const baseIdToAllIds = new Map()
    const baseCards = []

    for (let f = 0; f < rawFiles.length; f++) {
      const file = rawFiles[f]
      const content = file?.content
      if (!content) continue

      for (const baseId in content) {
        const cardData = content[baseId]
        if (!cardData) continue
        const cardVersions = cardData.all_cards || []
        const ids = new Array(cardVersions.length)
        for (let i = 0; i < cardVersions.length; i++) {
          ids[i] = cardVersions[i].id
        }

        baseIdToAllIds.set(baseId, ids)
        if (cardData.name) {
          let nameSet = nameToBaseIds.get(cardData.name)
          if (!nameSet) {
            nameSet = new Set()
            nameToBaseIds.set(cardData.name, nameSet)
          }
          nameSet.add(baseId)
        }

        baseCards.push({ baseId, cardData, cardIdPrefix: file.cardIdPrefix })
      }
    }

    // 2. 在 Base Card 層級建立雙向連結 (使用高效局部正則掃描 + Map O(1) 查找)
    const baseLinks = new Map()
    if (nameToBaseIds.size > 0) {
      for (let b = 0; b < baseCards.length; b++) {
        const { baseId, cardData } = baseCards[b]
        const effectText = cardData.effect || ''
        if (!effectText) continue

        QUOTE_REGEX.lastIndex = 0
        let match
        while ((match = QUOTE_REGEX.exec(effectText)) !== null) {
          const foundName = match[1]
          const sourceBaseIds = nameToBaseIds.get(foundName)
          if (sourceBaseIds) {
            for (const sourceBaseId of sourceBaseIds) {
              let baseSet = baseLinks.get(baseId)
              if (!baseSet) {
                baseSet = new Set()
                baseLinks.set(baseId, baseSet)
              }
              baseSet.add(sourceBaseId)

              let sourceSet = baseLinks.get(sourceBaseId)
              if (!sourceSet) {
                sourceSet = new Set()
                baseLinks.set(sourceBaseId, sourceSet)
              }
              sourceSet.add(baseId)
            }
          }
        }
      }
    }

    // 3. 展開卡片版本並直接注入 link 與 parallelCards
    for (let b = 0; b < baseCards.length; b++) {
      const { baseId, cardData, cardIdPrefix } = baseCards[b]
      if (cardData.product_name) productNamesSet.add(cardData.product_name)
      if (cardData.trait && Array.isArray(cardData.trait)) {
        for (let i = 0; i < cardData.trait.length; i++) {
          traitsSet.add(cardData.trait[i])
        }
      }

      const levelValue = cardData.level === '-' ? 0 : cardData.level
      if (typeof levelValue === 'number') {
        levelsSet.add(levelValue)
      }

      if (typeof cardData.cost === 'number') {
        if (cardData.cost < minCost) minCost = cardData.cost
        if (cardData.cost > maxCost) maxCost = cardData.cost
      }
      if (typeof cardData.power === 'number') {
        if (cardData.power < minPower) minPower = cardData.power
        if (cardData.power > maxPower) maxPower = cardData.power
      }
      const soulValue = cardData.soul === '-' ? 0 : cardData.soul
      if (typeof soulValue === 'number') {
        soulsSet.add(soulValue)
      }

      const cardVersions = cardData.all_cards
      if (cardVersions && Array.isArray(cardVersions) && cardVersions.length > 0) {
        let minIdLength = Infinity
        for (let i = 0; i < cardVersions.length; i++) {
          const idLen = cardVersions[i].id ? cardVersions[i].id.length : 0
          if (idLen < minIdLength) minIdLength = idLen
        }
        if (minIdLength === Infinity) minIdLength = 0

        const isLowestList = new Array(cardVersions.length)
        const highRarityCardIds = []
        const lowestRarityCardIds = []

        for (let i = 0; i < cardVersions.length; i++) {
          const cardVersion = cardVersions[i]
          const id = cardVersion.id || ''
          const lastCharCode = id.charCodeAt(id.length - 1)
          const isLastCharUpper = lastCharCode >= 65 && lastCharCode <= 90
          const isShortestLength = id.length === minIdLength
          const isLowest = NON_LOWEST_RARITIES.has(cardVersion.rarity)
            ? false
            : isLastCharUpper
              ? false
              : isShortestLength

          isLowestList[i] = isLowest
          if (isLowest) {
            lowestRarityCardIds.push(id)
          } else {
            highRarityCardIds.push(id)
          }
        }

        const linkedBaseIds = baseLinks.get(baseId)
        const fullLinkedIds = []
        if (linkedBaseIds && linkedBaseIds.size > 0) {
          for (const bId of linkedBaseIds) {
            const ids = baseIdToAllIds.get(bId)
            if (ids) {
              for (let j = 0; j < ids.length; j++) {
                fullLinkedIds.push(ids[j])
              }
            }
          }
        }

        const { all_cards: _all_cards, ...baseCardData } = cardData

        for (let i = 0; i < cardVersions.length; i++) {
          const cardVersion = cardVersions[i]
          if (cardVersion.rarity) raritiesSet.add(cardVersion.rarity)
          const isLowest = isLowestList[i]

          const card = {
            ...baseCardData,
            ...cardVersion,
            baseId,
            cardIdPrefix,
            isLowestRarity: isLowest,
            link: fullLinkedIds,
            parallelCards: isLowest ? highRarityCardIds : lowestRarityCardIds,
          }

          fetchedCards.push(card)
          if (card.id) {
            idToCardMap.set(card.id, card)
          }
        }
      }
    }

    allCards = fetchedCards

    return {
      allCards: fetchedCards,
      productNames: [...productNamesSet],
      traits: [...traitsSet],
      rarities: [...raritiesSet].sort(),
      souls: [...soulsSet].sort((a, b) => a - b),
      levels: [...levelsSet].sort((a, b) => a - b),
      costRange: {
        min: minCost === Infinity ? 0 : minCost,
        max: maxCost === -Infinity ? 0 : maxCost,
      },
      powerRange: {
        min: minPower === Infinity ? 0 : minPower,
        max: maxPower === -Infinity ? 0 : maxPower,
      },
    }
  },

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
    allCards = cards || []
    idToCardMap.clear()
    for (let i = 0; i < allCards.length; i++) {
      const card = allCards[i]
      if (card && card.id) {
        idToCardMap.set(card.id, card)
      }
    }
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
   * @param {string[]} searchTargets - 搜尋目標 ('id', 'name', 'effect')
   */
  searchByKeyword: (keyword, searchMode = 'precise', searchTargets = []) => {
    if (!keyword) {
      keywordResultsCache = allCards
      return
    }

    if (!searchIndex) {
      keywordResultsCache = allCards
      return
    }

    const effectiveTargets =
      searchTargets && searchTargets.length > 0 ? searchTargets : ['id', 'name', 'effect']

    if (keyword.length >= 2) {
      console.log(
        `Searching for "${keyword}" with mode "${searchMode}" in ${allCards.length} items...`
      )
      console.time('search time')

      // FlexSearch 搜索，傳遞 index 參數限制搜索欄位
      const searchResults = searchIndex.search(keyword, {
        limit: Infinity,
        index: effectiveTargets,
      })

      // 收集所有匹配索引
      const matchedIndices = new Set()
      for (let i = 0; i < searchResults.length; i++) {
        const fieldResult = searchResults[i]
        if (fieldResult && fieldResult.result) {
          const res = fieldResult.result
          for (let j = 0; j < res.length; j++) {
            matchedIndices.add(res[j])
          }
        }
      }

      // 取出卡片物件 (過濾無效 index 避免 undefined 導致後續 filter/sort 例外)
      const results = []
      for (const idx of matchedIndices) {
        const card = allCards[idx]
        if (card) results.push(card)
      }

      // precise 模式下用 includes 過濾
      let filteredResults = results
      if (searchMode === 'precise') {
        const lowerKeyword = keyword.toLowerCase()
        const checkName = effectiveTargets.includes('name')
        const checkId = effectiveTargets.includes('id')
        const checkEffect = effectiveTargets.includes('effect')

        filteredResults = results.filter((card) => {
          const inName = checkName && card.name && card.name.toLowerCase().includes(lowerKeyword)
          const inId = checkId && card.id && card.id.toLowerCase().includes(lowerKeyword)
          const inEffect =
            checkEffect && card.effect && card.effect.toLowerCase().includes(lowerKeyword)
          return inName || inId || inEffect
        })
      }

      // 精確匹配排前面
      filteredResults.sort((a, b) => {
        const aExact =
          a.name === keyword || a.id === keyword || (a.effect && a.effect.includes(keyword))
        const bExact =
          b.name === keyword || b.id === keyword || (b.effect && b.effect.includes(keyword))
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        return 0
      })

      console.timeEnd('search time')
      console.log(`Search found ${matchedIndices.size} potential matches.`)

      keywordResultsCache = filteredResults
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

    const {
      selectedCardTypes = [],
      selectedColors = [],
      selectedProductName,
      selectedTraits = [],
      selectedLevels = [],
      selectedRarities = [],
      showUniqueCards,
      selectedCostRange,
      selectedPowerRange,
      showTriggerSoul,
      selectedSoul = [],
    } = filters || {}

    const hasCardTypes = selectedCardTypes.length > 0
    const cardTypesSet = hasCardTypes ? new Set(selectedCardTypes) : null

    const hasColors = selectedColors.length > 0
    const colorsSet = hasColors ? new Set(selectedColors) : null

    const hasTraits = selectedTraits.length > 0

    const mappedLevels = selectedLevels.length > 0 ? new Set(selectedLevels.map(toZero)) : null

    const hasRarities = selectedRarities.length > 0
    const raritiesSet = hasRarities ? new Set(selectedRarities) : null

    const mappedSoul = selectedSoul.length > 0 ? new Set(selectedSoul.map(toZero)) : null

    const minCost = selectedCostRange ? selectedCostRange[0] : -Infinity
    const maxCost = selectedCostRange ? selectedCostRange[1] : Infinity
    const minPower = selectedPowerRange ? selectedPowerRange[0] : -Infinity
    const maxPower = selectedPowerRange ? selectedPowerRange[1] : Infinity

    return results.filter((card) => {
      if (!card) return false
      if (showUniqueCards && !card.isLowestRarity) {
        return false
      }
      if (hasCardTypes && !cardTypesSet.has(card.type)) {
        return false
      }
      if (hasColors && !colorsSet.has(card.color)) {
        return false
      }
      if (selectedProductName && card.product_name !== selectedProductName) {
        return false
      }
      if (
        hasTraits &&
        (!card.trait || !selectedTraits.some((trait) => card.trait.includes(trait)))
      ) {
        return false
      }
      if (mappedLevels && !mappedLevels.has(toZero(card.level))) return false
      if (hasRarities && !raritiesSet.has(card.rarity)) return false

      const cardCost = card.cost === '-' ? 0 : Number(card.cost)
      if (cardCost < minCost || cardCost > maxCost) return false
      if (card.power < minPower || card.power > maxPower) return false

      if (showTriggerSoul && (!card.trigger_soul_count || card.trigger_soul_count < 1)) {
        return false
      }
      if (mappedSoul && !mappedSoul.has(toZero(card.soul))) return false
      return true
    })
  },

  /**
   * 依卡片 ID 取得單張卡片資料
   * @param {string} id - 卡片 ID
   * @returns {Object|null} 卡片物件或 null
   */
  getCardById: (id) => {
    if (!id) return null
    return idToCardMap.get(id) || null
  },
}

expose(CardFilterService)
