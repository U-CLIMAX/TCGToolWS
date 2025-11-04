import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { inflate } from 'pako'
import { useCardFiltering } from '@/composables/useCardFiltering.js'
import { openDB, saveData, loadData } from '@/utils/db.js'

const dbName = 'CardDataDB'
const storeName = 'cardStore'
const dbKey = 'card-data'

export const useGlobalSearchStore = defineStore('globalSearch', () => {
  // --- State ---
  const allCards = ref([]) // 所有卡片資料
  const isReady = ref(false)
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
    allCards.value = data.cards
    productNames.value = data.filterOptions.productNames
    traits.value = data.filterOptions.traits
    rarities.value = data.filterOptions.rarities
    costRange.value = data.filterOptions.costRange
    powerRange.value = data.filterOptions.powerRange
    resetFilters()
    await initializeWorker(data.cards, { cacheKey: 'global-search-index', version })
    console.log(`✅ Successfully loaded ${allCards.value.length} cards from ${source}`)
  }

  const fetchAndStoreData = async (manifest) => {
    isLoading.value = true
    error.value = null
    let db
    try {
      const { version, chunked, chunks, fileName } = manifest
      let compressedBuffer

      if (chunked) {
        console.log(`📥 Fetching ${chunks.length} card database chunks from remote...`)
        const responses = await Promise.all(chunks.map((chunkFile) => fetch(`/${chunkFile}`)))

        for (const response of responses) {
          if (!response.ok) {
            throw new Error(`Failed to fetch a card database chunk: ${response.statusText}`)
          }
        }

        const buffers = await Promise.all(responses.map((res) => res.arrayBuffer()))

        // Concatenate buffers
        const totalLength = buffers.reduce((acc, buffer) => acc + buffer.byteLength, 0)
        const combined = new Uint8Array(totalLength)
        let offset = 0
        for (const buffer of buffers) {
          combined.set(new Uint8Array(buffer), offset)
          offset += buffer.byteLength
        }
        compressedBuffer = combined.buffer
      } else {
        console.log(`📥 Fetching card database from remote: ${fileName}`)
        const response = await fetch(`/${fileName}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch card database: ${response.statusText}`)
        }
        compressedBuffer = await response.arrayBuffer()
      }

      const decompressed = inflate(new Uint8Array(compressedBuffer), { to: 'string' })
      const data = JSON.parse(decompressed)

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
      isReady.value = false
    } finally {
      isLoading.value = false
    }
  }

  const terminate = () => {
    terminateWorker()
    allCards.value = []
    isReady.value = false
    searchResults.value = []
    hasActiveFilters.value = false
    resetFilters()
  }

  return {
    // State
    isReady,
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
