import { defineStore } from 'pinia'
import { ref, watch, nextTick, shallowRef } from 'vue'
import { useCardFiltering } from '@/composables/useCardFiltering.js'
import { openDB, saveData, loadData } from '@/utils/db.js'
import brotliPromise from 'brotli-wasm'

const dbName = 'CardDataDB'
const storeName = 'cardStore'

export const useGlobalSearchStore = defineStore('globalSearch', () => {
  // --- State ---
  const isReady = ref(false)
  const isInitialSetup = ref(false)
  const isLoading = ref(false)
  const error = ref(null)
  const currentGame = ref('ws')

  // --- Filter Options ---
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
    initializeWorker,
    terminateWorker,
  } = useCardFiltering(productNames, traits, rarities, costRange, powerRange)

  // --- Results ---
  // Use shallowRef for performance optimization when handling large lists
  const searchResults = shallowRef([])
  const searchCountDetails = ref({
    isCountOverThreshold: false,
    actualResultCount: 0,
  })
  const hasActiveFilters = ref(false)

  // Watch for changes in filteredCards from the composable and update the store's state
  watch(filteredCards, (newResult) => {
    searchCountDetails.value.actualResultCount = newResult.length
    searchCountDetails.value.isCountOverThreshold = newResult.length > 1000
    searchResults.value = newResult.slice(0, 1000)

    // Update hasActiveFilters based on whether there are any active filter criteria
    const hasAnyActiveFilters = [
      keyword.value && keyword.value.length >= 2,
      selectedCardTypes.value.length > 0,
      selectedColors.value.length > 0,
      selectedProductName.value,
      selectedTraits.value.length > 0,
      selectedLevels.value.length > 0,
      selectedRarities.value.length > 0,
      selectedCostRange.value[0] !== costRange.value.min ||
        selectedCostRange.value[1] !== costRange.value.max,
      selectedPowerRange.value[0] !== powerRange.value.min ||
        selectedPowerRange.value[1] !== powerRange.value.max,
      showTriggerSoul.value,
      selectedSoul.value.length > 0,
    ].some(Boolean)

    hasActiveFilters.value = hasAnyActiveFilters
  })

  // --- Data Loading Logic ---

  /**
   * Sets card data and initializes the worker
   * @param {Object} data - Card data object
   * @param {String} source - Data source (for logging)
   * @param {String} version - Version number
   * @param {Object} indexFiles - Map of pre-built index file paths
   */
  const setCardData = async (data, source, version, indexFiles) => {
    productNames.value = data.filterOptions.productNames
    traits.value = data.filterOptions.traits
    rarities.value = data.filterOptions.rarities
    souls.value = data.filterOptions.souls
    costRange.value = data.filterOptions.costRange
    powerRange.value = data.filterOptions.powerRange

    resetFilters()
    await initializeWorker(data.cards, {
      game: currentGame.value,
      version,
      indexFiles,
    })
    console.log(`✅ Successfully loaded ${data.cards.length} cards from ${source}`)
  }

  /**
   * Helper: Hydrates cards from columnar format back to object format
   * @param {Array} rows - Raw data rows
   * @param {Array} schema - Field name array
   * @param {Object} valueMaps - Maps for decoding optimized values
   */
  const hydrateCards = (rows, schema, valueMaps) => {
    if (!schema || !rows) return rows
    console.log(`💧 Hydrating ${rows.length} cards using schema & value maps...`)

    const colorIdx = schema.indexOf('color')
    const typeIdx = schema.indexOf('type')
    const traitIdx = schema.indexOf('trait')
    const lowRarityIdx = schema.indexOf('isLowestRarity')
    const powerIdx = schema.indexOf('power')
    const { colorMap, typeMap, traitMap } = valueMaps

    return rows.map((row) => {
      const card = {}
      row.forEach((val, idx) => {
        if (val === null) return

        let finalVal = val

        if (valueMaps) {
          if (idx === colorIdx) {
            finalVal = colorMap[val]
          } else if (idx === typeIdx) {
            finalVal = typeMap[val]
          } else if (idx === traitIdx && Array.isArray(val)) {
            finalVal = val.map((v) => traitMap[v])
          } else if (idx === lowRarityIdx) {
            finalVal = val === 1
          } else if (idx === powerIdx && typeof val === 'number') {
            finalVal = val * 500
          }
        }

        card[schema[idx]] = finalVal
      })
      return card
    })
  }

  /**
   * Fetches card data from remote server and stores it in local database
   * @param {Object} manifest
   */
  const fetchAndStoreData = async (manifest) => {
    const brotli = await brotliPromise

    isLoading.value = true
    error.value = null
    let db
    try {
      const { version, chunked, chunks, fileName, indexFiles, schema, valueMaps } = manifest

      const fileStream = new ReadableStream({
        async start(controller) {
          if (chunked) {
            console.log(`📥 Streaming ${chunks.length} chunks...`)
            for (const chunkFile of chunks) {
              const response = await fetch(`/${chunkFile}`)
              if (!response.ok) throw new Error(`Fetch error: ${chunkFile}`)

              const reader = response.body.getReader()
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                controller.enqueue(value)
              }
            }
          } else {
            const response = await fetch(`/${fileName}`)
            const reader = response.body.getReader()
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              controller.enqueue(value)
            }
          }
          controller.close()
        },
      })

      const decompressStream = new brotli.DecompressStream()
      const decompressionTransformer = new TransformStream({
        transform(chunk, controller) {
          let resultCode
          let inputOffset = 0
          const chunkSize = 4096

          do {
            const input = chunk.slice(inputOffset)
            const result = decompressStream.decompress(input, chunkSize)
            controller.enqueue(result.buf)
            resultCode = result.code
            inputOffset += result.input_offset
          } while (resultCode === brotli.BrotliStreamResultCode.NeedsMoreOutput)

          if (
            resultCode !== brotli.BrotliStreamResultCode.NeedsMoreInput &&
            resultCode !== brotli.BrotliStreamResultCode.ResultSuccess
          ) {
            controller.error(`Decompression failed with code ${resultCode}`)
          }
        },
      })

      const jsonStream = fileStream
        .pipeThrough(decompressionTransformer)
        .pipeThrough(new TextDecoderStream())

      const reader = jsonStream.getReader()
      let jsonString = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        jsonString += value
      }

      console.log('Hz Decoding complete, parsing JSON...')
      const data = JSON.parse(jsonString)
      data.cards = hydrateCards(data.cards, schema, valueMaps)

      db = await openDB(dbName, storeName, 'key')
      await saveData(db, storeName, { key: `card-data-${currentGame.value}`, data })
      console.log('💾 Card data has been stored in the local database (IndexedDB)')

      await setCardData(data, 'remote server', version, indexFiles)

      localStorage.setItem(`global_search_index_version_${currentGame.value}`, version)
      console.log(`📌 Version updated: ${version}`)
    } catch (e) {
      console.error('❌ Error loading or saving card data:', e)
      error.value = e
      throw e
    } finally {
      if (db) db.close()
      isLoading.value = false
    }
  }

  /**
   * Loads card data from local database
   * @param {String} version
   * @param {Object} indexFiles
   */
  const loadDataFromLocal = async (version, indexFiles) => {
    isLoading.value = true
    let db
    try {
      db = await openDB(dbName, storeName, 'key')
      const result = await loadData(db, storeName, `card-data-${currentGame.value}`)
      const cachedData = result?.data
      if (!cachedData) {
        console.warn('⚠️ Local cache is empty or invalid.')
        throw new Error('Local cache is empty.')
      }
      await setCardData(cachedData, 'local database (IndexedDB)', version, indexFiles)
    } catch (e) {
      console.error('❌ Failed to load from local database:', e)
      throw e
    } finally {
      if (db) db.close()
      isLoading.value = false
    }
  }

  // --- Actions ---

  /**
   * Initializes the global search store for a specific game
   * @param {String} game
   */
  const initialize = async (game = 'ws') => {
    if (game !== currentGame.value) {
      currentGame.value = game
      isReady.value = false
    }
    console.log(`🔍 Checking card database version for ${currentGame.value}...`)
    isLoading.value = true
    error.value = null

    try {
      const manifestResponse = await fetch(`/card-db-manifest-${currentGame.value}.json`)
      if (!manifestResponse.ok) throw new Error('Failed to load manifest file')

      const manifest = await manifestResponse.json()
      const currentVersion = manifest.version
      const indexFiles = manifest.indexFiles || null

      const storedVersion = localStorage.getItem(`global_search_index_version_${currentGame.value}`)

      let loadedFromLocal = false
      if (storedVersion === currentVersion) {
        console.log('✅ Versions match, trying to load from local database...')
        try {
          await loadDataFromLocal(currentVersion, indexFiles)
          loadedFromLocal = true
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          console.log('↪️ Local load failed, will fetch from remote as a fallback.')
        }
      }

      if (!loadedFromLocal) {
        isInitialSetup.value = true
        await nextTick()

        if (storedVersion !== currentVersion) {
          console.log(
            `🔄 Version mismatch (Local: ${storedVersion || 'None'}, Remote: ${currentVersion}), fetching new data...`
          )
        }
        await fetchAndStoreData(manifest)
      }

      isReady.value = true
      console.log('✨ Data is ready!')
    } catch (e) {
      console.error('❌ Initialization failed:', e)
      error.value = e
      isInitialSetup.value = false
      isReady.value = false
    } finally {
      isInitialSetup.value = false
      isLoading.value = false
    }
  }

  /**
   * Terminates the search and resets state
   */
  const terminate = () => {
    terminateWorker()
    isReady.value = false
    searchResults.value = []
    hasActiveFilters.value = false
    resetFilters()
  }

  return {
    // State
    currentGame,
    isReady,
    isInitialSetup,
    isLoading,
    error,
    // Filter Options
    productNames,
    traits,
    rarities,
    souls,
    costRange,
    powerRange,
    // Selected Filters
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
    // Results
    searchResults,
    searchCountDetails,
    hasActiveFilters,
    // Actions
    initialize,
    resetFilters,
    terminate,
  }
})
