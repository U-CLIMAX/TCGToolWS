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
  const allCards = shallowRef([]) // Optimized: shallowRef for large dataset
  const isLoading = ref(false)
  const error = ref(null)

  // Filter options derived from raw data
  const productNames = ref([])
  const traits = ref([])
  const rarities = ref([])
  const souls = ref([])
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
    showTriggerSoul,
    selectedSoul,
    resetFilters,
    filteredCards,
    terminateWorker,
    initializeWorker,
    processRawDataInWorker,
  } = useCardFiltering(productNames, traits, rarities, costRange, powerRange)

  // --- Actions ---

  const fetchAndProcessCards = async (prefixes) => {
    if (!prefixes || prefixes.length === 0) {
      return {
        allCards: [],
        productNames: [],
        traits: [],
        souls: [],
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

      // Wait for all fetches to complete (Main thread network I/O)
      const allFileContents = (await Promise.all(fetchTasks)).filter((item) => item !== null)

      if (allFileContents.length === 0) {
        return {
          allCards: [],
          productNames: [],
          traits: [],
          souls: [],
          costRange: { min: 0, max: 0 },
          powerRange: { min: 0, max: 0 },
        }
      }

      const result = await processRawDataInWorker(allFileContents)

      return result
    } catch (e) {
      console.error('Failed to load series cards in filter store:', e)
      error.value = e
      return {
        allCards: [],
        productNames: [],
        traits: [],
        souls: [],
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
        souls: fetchedSouls,
        costRange: fetchedCostRange,
        powerRange: fetchedPowerRange,
      } = await fetchAndProcessCards(prefixes)

      allCards.value = fetchedCards
      productNames.value = fetchedProductNames
      traits.value = fetchedTraits
      rarities.value = fetchedRarities
      souls.value = fetchedSouls
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
    processedPathsHistory.clear() // Reset history
    allCards.value = []
    productNames.value = []
    traits.value = []
    rarities.value = []
    souls.value = []
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
    souls,

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
    showTriggerSoul,
    selectedSoul,
    // Getters
    filteredCards,
    // Actions
    initialize,
    fetchAndProcessCards,
    resetFilters,
    reset,
  }
})
