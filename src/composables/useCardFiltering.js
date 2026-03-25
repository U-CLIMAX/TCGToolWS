import {
  ref,
  computed,
  watch,
  shallowRef,
  toRaw,
  onUnmounted,
  getCurrentInstance,
} from 'vue'
import { wrap } from 'comlink'
import FilterWorker from '@/workers/filter.worker.js?worker'
import { debounceRef } from '@/composables/useDebounceRef'

export const useCardFiltering = (
  productNamesRef,
  traitsRef,
  raritiesRef,
  costRangeRef,
  powerRangeRef
) => {
  // --- State ---
  const keyword = debounceRef(null, 300)
  const searchMode = ref('precise') // 'precise' or 'fuzzy'
  const selectedCardTypes = ref([])
  const selectedColors = ref([])
  const selectedProductName = ref(null)
  const selectedTraits = ref([])
  const selectedLevels = ref([])
  const selectedRarities = ref([])
  const showUniqueCards = ref(false)
  const selectedCostRange = ref([0, 0])
  const selectedPowerRange = ref([0, 0])
  const showTriggerSoul = ref(false)
  const selectedSoul = ref([])

  const workerResults = shallowRef([])
  const filteredCards = computed(() => workerResults.value)

  // --- Worker Management ---
  let workerInstance = null
  let workerApiInstance = null
  let workerReadyPromise = null
  let resolveWorkerReady = null

  // Used to track the latest request and ignore stale results
  let lastRequestId = 0

  /**
   * Initializes or returns the worker instance
   */
  const ensureWorker = () => {
    if (!workerInstance) {
      workerInstance = new FilterWorker()
      workerApiInstance = wrap(workerInstance)
      workerReadyPromise = new Promise((resolve) => {
        resolveWorkerReady = resolve
      })
    }
    return workerApiInstance
  }

  /**
   * Processes raw card data in the worker
   */
  const processRawDataInWorker = async (rawFiles) => {
    const api = ensureWorker()
    return await api.processRawData(rawFiles)
  }

  /**
   * Initializes the worker with card data and options
   */
  const initializeWorker = async (cards, options) => {
    const api = ensureWorker()

    if (cards && cards.length > 0) {
      await api.init(toRaw(cards), toRaw(options))
      if (resolveWorkerReady) {
        resolveWorkerReady()
        resolveWorkerReady = null // Only resolve once
      }
      // Trigger initial filtering after worker is ready
      await applyKeywordSearchAndFilter()
    } else {
      workerResults.value = []
    }
  }

  /**
   * Applies attribute filters to the current search results
   */
  const applyAttributeFilters = async () => {
    if (workerReadyPromise) await workerReadyPromise
    if (!workerApiInstance) return

    const requestId = ++lastRequestId
    const attributeFilters = {
      selectedCardTypes: toRaw(selectedCardTypes.value),
      selectedColors: toRaw(selectedColors.value),
      selectedProductName: toRaw(selectedProductName.value),
      selectedTraits: toRaw(selectedTraits.value),
      selectedLevels: toRaw(selectedLevels.value),
      selectedRarities: toRaw(selectedRarities.value),
      showUniqueCards: toRaw(showUniqueCards.value),
      selectedCostRange: toRaw(selectedCostRange.value),
      selectedPowerRange: toRaw(selectedPowerRange.value),
      showTriggerSoul: toRaw(showTriggerSoul.value),
      selectedSoul: toRaw(selectedSoul.value),
    }

    try {
      const results = await workerApiInstance.filterByAttributes(attributeFilters)
      // Only update if this is still the latest request
      if (requestId === lastRequestId) {
        workerResults.value = results
      }
    } catch (error) {
      console.error('Error applying attribute filters:', error)
    }
  }

  /**
   * Performs keyword search and then applies attribute filters
   */
  const applyKeywordSearchAndFilter = async () => {
    if (workerReadyPromise) await workerReadyPromise
    if (!workerApiInstance) return

    const requestId = ++lastRequestId
    try {
      await workerApiInstance.searchByKeyword(toRaw(keyword.value), toRaw(searchMode.value))
      const results = await workerApiInstance.filterByAttributes({
        selectedCardTypes: toRaw(selectedCardTypes.value),
        selectedColors: toRaw(selectedColors.value),
        selectedProductName: toRaw(selectedProductName.value),
        selectedTraits: toRaw(selectedTraits.value),
        selectedLevels: toRaw(selectedLevels.value),
        selectedRarities: toRaw(selectedRarities.value),
        showUniqueCards: toRaw(showUniqueCards.value),
        selectedCostRange: toRaw(selectedCostRange.value),
        selectedPowerRange: toRaw(selectedPowerRange.value),
        showTriggerSoul: toRaw(showTriggerSoul.value),
        selectedSoul: toRaw(selectedSoul.value),
      })

      // Only update if this is still the latest request
      if (requestId === lastRequestId) {
        workerResults.value = results
      }
    } catch (error) {
      console.error('Error applying keyword search and filter:', error)
    }
  }

  /**
   * Terminates the worker and cleans up resources
   */
  const terminateWorker = () => {
    if (workerInstance) {
      workerInstance.terminate()
      workerInstance = null
      workerApiInstance = null
      workerReadyPromise = null
      resolveWorkerReady = null
    }
  }

  // --- Watchers ---
  watch(keyword, () => {
    applyKeywordSearchAndFilter()
  })

  watch(searchMode, () => {
    // Only search if keyword is meaningful
    if ((keyword.value || '').length < 2) return
    applyKeywordSearchAndFilter()
  })

  watch(
    [
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
    ],
    () => {
      applyAttributeFilters()
    }
  )

  /**
   * Resets all filter values to their defaults
   */
  const resetFilters = () => {
    keyword.value = null
    searchMode.value = 'precise'
    selectedCardTypes.value = []
    selectedColors.value = []
    selectedProductName.value = null
    selectedTraits.value = []
    selectedLevels.value = []
    selectedRarities.value = []
    showUniqueCards.value = false
    selectedCostRange.value = [costRangeRef.value.min, costRangeRef.value.max]
    selectedPowerRange.value = [powerRangeRef.value.min, powerRangeRef.value.max]
    showTriggerSoul.value = false
    selectedSoul.value = []
  }

  // Cleanup on unmount if used within a component
  if (getCurrentInstance()) {
    onUnmounted(terminateWorker)
  }

  return {
    // State
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
    resetFilters,
    terminateWorker,
    initializeWorker,
    processRawDataInWorker,
  }
}
