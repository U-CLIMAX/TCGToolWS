import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { findSeriesDataFileName } from '@/maps/series-card-map.js'
import { getAssetsFile } from '@/utils/getAssetsFile.js'
import { useCardFiltering } from '@/composables/useCardFiltering.js'

export const useFilterStore = defineStore('filter', () => {
  // --- State ---

  // Cache for series data to prevent re-fetching
  const seriesDataCache = shallowRef({})

  // History of all paths added to the queue to avoid duplicate processing
  const processedPathsHistory = new Set()

  // Queue system for fetching files
  const fetchQueue = []
  const activeFetchPromises = new Map()
  let isProcessingQueue = false

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

  /**
   * Processes the fetch queue in batches
   */
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

  /**
   * Fetches and processes card data for given prefixes
   * @param {string[]} prefixes
   */
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
      const dataFilePaths = findSeriesDataFileName(prefixes)
      const newPathsToFetch = dataFilePaths.filter((path) => !processedPathsHistory.has(path))

      if (newPathsToFetch.length > 0) {
        newPathsToFetch.forEach((path) => {
          processedPathsHistory.add(path)

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

        processFetchQueue()
      }

      const fetchTasks = dataFilePaths.map((path) => {
        if (seriesDataCache.value[path]) {
          return Promise.resolve(seriesDataCache.value[path])
        }
        if (activeFetchPromises.has(path)) {
          return activeFetchPromises.get(path).promise
        }
        return Promise.resolve(null)
      })

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

      return await processRawDataInWorker(allFileContents)
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

  /**
   * Initializes the filter store with card data
   * @param {string[]} prefixes
   */
  const initialize = async (prefixes) => {
    isLoading.value = true
    error.value = null
    try {
      const result = await fetchAndProcessCards(prefixes)

      allCards.value = result.allCards
      productNames.value = result.productNames
      traits.value = result.traits
      rarities.value = result.rarities
      souls.value = result.souls
      costRange.value = result.costRange
      powerRange.value = result.powerRange

      resetFilters()
      await initializeWorker(result.allCards)
    } catch (e) {
      console.error('Failed to initialize filter store:', e)
      error.value = e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Resets the filter store state
   */
  const reset = () => {
    terminateWorker()
    processedPathsHistory.clear()
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
    // Computed
    filteredCards,
    // Actions
    initialize,
    fetchAndProcessCards,
    resetFilters,
    reset,
  }
})
