import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { findSeriesDataFileName } from '@/maps/series-card-map.js'
import { getAssetsFile } from '@/utils/getAssetsFile.js'
import { useCardFiltering } from '@/composables/useCardFiltering.js'

export const useFilterStore = defineStore('filter', () => {
  // --- State ---

  // Cache for series data to prevent re-fetching
  const seriesDataCache = shallowRef({})

  // 用於記錄所有已加入過 Queue 的路徑歷史，避免重複處理
  const processedPathsHistory = new Set()

  // Queue system for fetching files
  const fetchQueue = []
  const activeFetchPromises = new Map()
  let isProcessingQueue = false

  const processFetchQueue = async () => {
    if (isProcessingQueue) return
    isProcessingQueue = true

    try {
      while (fetchQueue.length > 0) {
        const batch = fetchQueue.splice(0, 30)
        await Promise.all(
          batch.map(async (path) => {
            const deferred = activeFetchPromises.get(path)
            if (!deferred) return

            try {
              if (seriesDataCache.value[path]) {
                deferred.resolve(seriesDataCache.value[path])
                return
              }

              const url = await getAssetsFile(path)
              const response = await fetch(url)
              if (!response.ok) throw new Error(`Failed to fetch ${path}`)

              const result = {
                content: await response.json(),
                cardIdPrefix: path.split('/').pop().replace('.json', ''),
              }

              seriesDataCache.value = {
                ...seriesDataCache.value,
                [path]: result,
              }
              deferred.resolve(result)
            } catch (err) {
              console.warn(`Error loading ${path}:`, err)
              deferred.resolve(null)
            } finally {
              activeFetchPromises.delete(path)
            }
          })
        )
      }
    } finally {
      isProcessingQueue = false
    }
  }

  // Raw data from API
  const allCards = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // Filter options derived from raw data
  const productNames = ref([])
  const traits = ref([])
  const rarities = ref([])
  const costRange = ref({ min: 0, max: 0 })
  const powerRange = ref({ min: 0, max: 0 })

  // Use the composable for filtering logic
  const {
    keyword,
    searchMode,
    selectedCardTypes,
    selectedColors,
    selectedProductName,
    selectedTraits,
    selectedLevels,
    selectedRarities,
    showUniqueCards,
    selectedCostRange,
    selectedPowerRange,
    resetFilters,
    filteredCards,
    terminateWorker,
    initializeWorker,
  } = useCardFiltering(productNames, traits, rarities, costRange, powerRange)

  // --- Actions ---

  const fetchAndProcessCards = async (prefixes) => {
    if (!prefixes || prefixes.length === 0) {
      return {
        allCards: [],
        productNames: [],
        traits: [],
        costRange: { min: 0, max: 0 },
        powerRange: { min: 0, max: 0 },
      }
    }

    error.value = null

    try {
      // 取得所有需要的檔案路徑
      const dataFilePaths = findSeriesDataFileName(prefixes)

      // 過濾出尚未存在於歷史紀錄中的新路徑
      const newPathsToFetch = dataFilePaths.filter((path) => !processedPathsHistory.has(path))

      console.group('🔍 請求過濾檢查')
      console.log('1. 這次需要的全部檔案:', dataFilePaths.length)
      console.log('2. 歷史已記錄的檔案:', [...processedPathsHistory].length)
      console.log('3. 過濾後，真正要下載的新檔案:', newPathsToFetch.length)
      console.groupEnd()

      // 將新路徑加入歷史紀錄，並建立 Fetch 任務
      if (newPathsToFetch.length > 0) {
        newPathsToFetch.forEach((path) => {
          processedPathsHistory.add(path) // 記錄到歷史變數

          // 雙重檢查：雖然 history 過濾了，但保險起見檢查 Cache 和進行中的 Promise
          if (seriesDataCache.value[path] || activeFetchPromises.has(path)) {
            return
          }

          let resolve, reject
          const promise = new Promise((res, rej) => {
            resolve = res
            reject = rej
          })

          activeFetchPromises.set(path, { resolve, reject, promise })
          fetchQueue.push(path)
        })

        // 啟動 Queue 處理
        processFetchQueue()
      }

      // 收集結果：這裡必須對「原本請求的所有路徑 (dataFilePaths)」進行等待
      // 因為舊的路徑雖然沒加入 Queue，但仍需要它的資料 (從 Cache 或正在進行的 Promise)
      const fetchTasks = dataFilePaths.map((path) => {
        // Case A: 已經在 Cache 中
        if (seriesDataCache.value[path]) {
          return Promise.resolve(seriesDataCache.value[path])
        }

        // Case B: 正在下載中 (包含剛剛加入 Queue 的)
        if (activeFetchPromises.has(path)) {
          return activeFetchPromises.get(path).promise
        }

        // Case C: 異常狀況 (理論上不應發生，除非下載失敗且沒在 Cache)
        return Promise.resolve(null)
      })

      const allFileContents = (await Promise.all(fetchTasks)).filter((item) => item !== null)

      const fetchedCards = []
      const productNamesSet = new Set()
      const traitsSet = new Set()
      const raritiesSet = new Set()
      let minCost = Infinity,
        maxCost = -Infinity,
        minPower = Infinity,
        maxPower = -Infinity

      for (const file of allFileContents) {
        for (const baseId in file.content) {
          const cardData = file.content[baseId]

          if (cardData.product_name) productNamesSet.add(cardData.product_name)
          if (cardData.trait && Array.isArray(cardData.trait))
            cardData.trait.forEach((t) => traitsSet.add(t))
          if (typeof cardData.cost === 'number') {
            minCost = Math.min(minCost, cardData.cost)
            maxCost = Math.max(maxCost, cardData.cost)
          }
          if (typeof cardData.power === 'number') {
            minPower = Math.min(minPower, cardData.power)
            maxPower = Math.max(maxPower, cardData.power)
          }

          const { all_cards, ...baseCardData } = cardData
          if (all_cards && Array.isArray(all_cards)) {
            const minIdLength =
              all_cards.length > 0 ? Math.min(...all_cards.map((c) => c.id.length)) : 0

            all_cards.forEach((cardVersion) => {
              if (cardVersion.rarity) raritiesSet.add(cardVersion.rarity)

              // 如果只有一張卡 且 最後是英文 -> 強制 false (代表是異圖)
              const lastChar = cardVersion.id.slice(-1)
              const isLastCharLetter =
                (lastChar >= 'A' && lastChar <= 'Z') || (lastChar >= 'a' && lastChar <= 'z')

              // 判斷卡號是否等於最短長度
              const isShortestLength = cardVersion.id.length === minIdLength

              const isLowest = all_cards.length === 1 && isLastCharLetter ? false : isShortestLength

              fetchedCards.push({
                ...baseCardData,
                ...cardVersion,
                baseId,
                cardIdPrefix: file.cardIdPrefix,
                isLowestRarity: isLowest,
              })
            })
          }
        }
      }

      fetchedCards.forEach((card) => (card.link = []))

      const nameToCardBaseIds = new Map()
      const baseIdToCardsMap = new Map()

      for (const card of fetchedCards) {
        if (!nameToCardBaseIds.has(card.name)) {
          nameToCardBaseIds.set(card.name, new Set())
        }
        nameToCardBaseIds.get(card.name).add(card.baseId)

        if (!baseIdToCardsMap.has(card.baseId)) {
          baseIdToCardsMap.set(card.baseId, [])
        }
        baseIdToCardsMap.get(card.baseId).push(card)
      }

      const escapeRegex = (str) => {
        return str.replace(/[.*+?^${}()|[\\]/g, '\\$&')
      }

      const allNamesPattern = [...nameToCardBaseIds.keys()].map(escapeRegex).join('|')

      const nameMatcherRegex = new RegExp(`「(${allNamesPattern})」`, 'g')

      for (const targetCard of fetchedCards) {
        const effectText = targetCard.effect || ''
        if (!effectText) continue

        const matches = effectText.matchAll(nameMatcherRegex)

        for (const match of matches) {
          const foundName = match[1]
          const sourceBaseIds = nameToCardBaseIds.get(foundName)

          if (sourceBaseIds) {
            for (const sourceBaseId of sourceBaseIds) {
              if (!targetCard.link.includes(sourceBaseId)) {
                targetCard.link.push(sourceBaseId)
              }
              const sourceCardsToUpdate = baseIdToCardsMap.get(sourceBaseId)
              if (sourceCardsToUpdate) {
                for (const sourceCard of sourceCardsToUpdate) {
                  if (!sourceCard.link.includes(targetCard.baseId)) {
                    sourceCard.link.push(targetCard.baseId)
                  }
                }
              }
            }
          }
        }
      }

      const result = {
        allCards: fetchedCards,
        productNames: [...productNamesSet],
        traits: [...traitsSet],
        rarities: [...raritiesSet].sort(),
        costRange: {
          min: minCost === Infinity ? 0 : minCost,
          max: maxCost === -Infinity ? 0 : maxCost,
        },
        powerRange: {
          min: minPower === Infinity ? 0 : minPower,
          max: maxPower === -Infinity ? 0 : maxPower,
        },
      }

      return result
    } catch (e) {
      console.error('Failed to load series cards in filter store:', e)
      error.value = e
      return {
        allCards: [],
        productNames: [],
        traits: [],
        costRange: { min: 0, max: 0 },
        powerRange: { min: 0, max: 0 },
      }
    }
  }

  const initialize = async (prefixes) => {
    isLoading.value = true
    error.value = null
    try {
      const {
        allCards: fetchedCards,
        productNames: fetchedProductNames,
        traits: fetchedTraits,
        rarities: fetchedRarities,
        costRange: fetchedCostRange,
        powerRange: fetchedPowerRange,
      } = await fetchAndProcessCards(prefixes)

      allCards.value = fetchedCards
      productNames.value = fetchedProductNames
      traits.value = fetchedTraits
      rarities.value = fetchedRarities
      costRange.value = fetchedCostRange
      powerRange.value = fetchedPowerRange
      resetFilters()
      await initializeWorker(fetchedCards)
    } catch (e) {
      console.error('Failed to initialize filter store:', e)
      error.value = e
    } finally {
      isLoading.value = false
    }
  }

  const reset = () => {
    terminateWorker()
    processedPathsHistory.clear() // [新增] Reset 時也清空歷史紀錄
    allCards.value = []
    productNames.value = []
    traits.value = []
    rarities.value = []
    costRange.value = { min: 0, max: 0 }
    powerRange.value = { min: 0, max: 0 }
    resetFilters()
  }

  return {
    // State
    allCards,
    isLoading,
    error,
    productNames,
    traits,
    rarities,
    costRange,
    powerRange,
    keyword,
    searchMode,
    selectedCardTypes,
    selectedColors,
    selectedProductName,
    selectedTraits,
    selectedLevels,
    selectedRarities,
    showUniqueCards,
    selectedCostRange,
    selectedPowerRange,
    // Getters
    filteredCards,
    // Actions
    initialize,
    fetchAndProcessCards,
    resetFilters,
    reset,
  }
})
