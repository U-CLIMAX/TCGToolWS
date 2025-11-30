import { defineStore } from 'pinia'
import { ref, watch, nextTick } from 'vue'
import { useCardFiltering } from '@/composables/useCardFiltering.js'
import { openDB, saveData, loadData } from '@/utils/db.js'
import brotliPromise from 'brotli-wasm'

const dbName = 'CardDataDB'
const storeName = 'cardStore'
const dbKey = 'card-data'

export const useGlobalSearchStore = defineStore('globalSearch', () => {
  // --- State ---
  const isReady = ref(false)
  const isInitialSetup = ref(false)
  const isLoading = ref(false)
  const error = ref(null)

  // --- Filter Options ---
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
    initializeWorker,
    terminateWorker,
  } = useCardFiltering(productNames, traits, rarities, costRange, powerRange)

  // --- Search Results ---
  const searchResults = ref([])
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
    ].some(Boolean)

    hasActiveFilters.value = hasAnyActiveFilters
  })

  // --- Data Loading Logic ---

  const setCardData = async (data, source, version) => {
    productNames.value = data.filterOptions.productNames
    traits.value = data.filterOptions.traits
    rarities.value = data.filterOptions.rarities
    costRange.value = data.filterOptions.costRange
    powerRange.value = data.filterOptions.powerRange
    resetFilters()
    await initializeWorker(data.cards, { cacheKey: 'global-search-index', version })
    console.log(`✅ Successfully loaded ${data.cards.length} cards from ${source}`)
  }

  const fetchAndStoreData = async (manifest) => {
    const brotli = await brotliPromise

    isLoading.value = true
    error.value = null
    let db
    try {
      const { version, chunked, chunks, fileName } = manifest

      // 建立一個來源串流，依序抓取 chunks
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
            // 單一檔案模式
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

      // 設定 Brotli 解壓縮串流
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

      // 串接pipeline：下載 -> 解壓縮 -> 轉字串
      const jsonStream = fileStream
        .pipeThrough(decompressionTransformer)
        .pipeThrough(new TextDecoderStream())

      // 讀取最終字串
      const reader = jsonStream.getReader()
      let jsonString = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        jsonString += value
      }

      console.log('Hz Decoding complete, parsing JSON...')
      const data = JSON.parse(jsonString)

      db = await openDB(dbName, storeName, 'key')
      await saveData(db, storeName, { key: dbKey, data })
      console.log('💾 Card data has been stored in the local database (IndexedDB)')

      await setCardData(data, 'remote server', version)

      localStorage.setItem('global_search_index_version', version)
      console.log(`📌 Version updated: ${version}`)
    } catch (e) {
      console.error('❌ Error loading or saving card data:', e)
      error.value = e
      throw e // Re-throw to be caught by initialize
    } finally {
      if (db) db.close()
      isLoading.value = false
    }
  }

  const loadDataFromLocal = async (version) => {
    isLoading.value = true
    let db
    try {
      db = await openDB(dbName, storeName, 'key')
      const result = await loadData(db, storeName, dbKey)
      const cachedData = result?.data
      if (!cachedData) {
        console.warn('⚠️ Local cache is empty or invalid.')
        throw new Error('Local cache is empty.') // Trigger fallback
      }
      await setCardData(cachedData, 'local database (IndexedDB)', version)
    } catch (e) {
      console.error('❌ Failed to load from local database:', e)
      throw e // Re-throw to be caught by initialize for fallback
    } finally {
      if (db) db.close()
      isLoading.value = false
    }
  }

  const initialize = async () => {
    console.log('🔍 Checking card database version...')
    isLoading.value = true
    error.value = null

    try {
      const manifestResponse = await fetch('/card-db-manifest.json')
      if (!manifestResponse.ok) throw new Error('Failed to load manifest file')

      const manifest = await manifestResponse.json()
      const currentVersion = manifest.version
      console.log(`📌 Current version: ${currentVersion}`)

      const storedVersion = localStorage.getItem('global_search_index_version')
      console.log(`📌 Local version: ${storedVersion || 'None'}`)

      let loadedFromLocal = false
      if (storedVersion === currentVersion) {
        console.log('✅ Versions match, trying to load from local database...')
        try {
          await loadDataFromLocal(currentVersion)
          loadedFromLocal = true
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          console.log('↪️ Local load failed, will fetch from remote as a fallback.')
        }
      }

      if (!loadedFromLocal) {
        isInitialSetup.value = true
        await nextTick() // Wait for the DOM to update before performing time-consuming operations

        if (storedVersion !== currentVersion) {
          console.log(
            `🔄 Version mismatch (Local: ${
              storedVersion || 'None'
            }, Remote: ${currentVersion}), fetching new data...`
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

  const terminate = () => {
    terminateWorker()
    isReady.value = false
    searchResults.value = []
    hasActiveFilters.value = false
    resetFilters()
  }

  return {
    // State
    isReady,
    isInitialSetup,
    isLoading,
    error,
    // Filter Options
    productNames,
    traits,
    rarities,
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
