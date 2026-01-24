import { ref, computed, watch, shallowRef, toRaw, onUnmounted } from 'vue'
import { wrap } from 'comlink'
import FilterWorker from '@/workers/filter.worker.js?worker'

export const useCardFiltering = (
  productNamesRef,
  traitsRef,
  raritiesRef,
  costRangeRef,
  powerRangeRef
) => {
  // User-selected filter values
  const keyword = ref(null)
  const searchMode = ref('precise') // precise or fuzzy
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
  let workerInstance = null
  let workerApiInstance = null

  const ensureWorker = () => {
    if (!workerInstance) {
      console.log('正在建立 Worker...')
      workerInstance = new FilterWorker()
      workerApiInstance = wrap(workerInstance)
    }
  }

  const processRawDataInWorker = async (rawFiles) => {
    ensureWorker()
    return await workerApiInstance.processRawData(rawFiles)
  }

  const initializeWorker = async (cards, options) => {
    ensureWorker()

    if (cards && cards.length > 0) {
      await workerApiInstance.init(toRaw(cards), toRaw(options))
      await applyKeywordSearchAndFilter() // Trigger initial filtering after worker is ready
    } else {
      // If no cards, ensure results are empty
      workerResults.value = []
    }
  }

  const applyAttributeFilters = async () => {
    if (!workerApiInstance) {
      console.warn('Worker API not initialized, cannot apply attribute filters.')
      return
    }
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
    const results = await workerApiInstance.filterByAttributes(attributeFilters)
    workerResults.value = results
  }

  const applyKeywordSearchAndFilter = async () => {
    if (!workerApiInstance) {
      console.warn('Worker API not initialized, cannot apply keyword search.')
      return
    }
    await workerApiInstance.searchByKeyword(toRaw(keyword.value), toRaw(searchMode.value))
    await applyAttributeFilters()
  }

  const terminateWorker = () => {
    if (workerInstance) {
      console.log('正在終止 Worker。')
      workerInstance.terminate()
      workerInstance = null
      workerApiInstance = null
    }
  }

  // Watch for keyword changes to perform a new search
  watch(keyword, () => {
    applyKeywordSearchAndFilter()
  })

  watch(searchMode, () => {
    if (keyword.value.length < 2) return // Do not trigger search when searchMode is changed and keyword is shorter than 2 characters
    applyKeywordSearchAndFilter()
  })

  // Watch for other filter changes to refine the current search results
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
    applyAttributeFilters
  )

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

  // Automatically terminate the worker when the component using this composable is unmounted.
  // Note: This will only work if the composable is used within a component's setup context.
  // It has no effect when used directly inside a Pinia store's setup function,
  // but it's a good practice for safety and future refactoring.
  onUnmounted(terminateWorker)

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
