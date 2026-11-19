import { ref, computed, watch, shallowRef, toRaw } from 'vue'
import { wrap, transfer } from 'comlink'
import FilterWorker from '@/workers/filter.worker.js?worker'
import { decompressBrotliMapInWorker } from '@/utils/brotliClient.js'
import { debounceRef } from '@/composables/useDebounceRef'

export const useCardFiltering = ({ requireActiveFilter = false, maxResults = Infinity } = {}) => {
  // --- State ---
  const keyword = debounceRef(null, 300)
  const searchMode = ref('precise') // 'precise' or 'fuzzy'
  const searchTargets = ref([])
  const selectedCardTypes = ref([])
  const selectedColors = ref([])
  const selectedProductName = ref(null)
  const selectedTraits = ref([])
  const selectedLevels = ref([])
  const selectedRarities = ref([])
  const showUniqueCards = ref(false)
  const selectedCosts = ref([])
  const selectedPowers = ref([])
  const powerRange = ref([null, null])
  const showTriggerSoul = ref(false)
  const selectedSoul = ref([])

  const workerResults = shallowRef([])
  const totalMatchedCount = ref(0)
  const filteredCards = computed(() => workerResults.value)
  const hasActiveFilters = computed(() =>
    Boolean(
      (keyword.value && keyword.value.length >= 2) ||
      selectedCardTypes.value.length > 0 ||
      selectedColors.value.length > 0 ||
      selectedProductName.value ||
      selectedTraits.value.length > 0 ||
      selectedLevels.value.length > 0 ||
      selectedCosts.value.length > 0 ||
      selectedRarities.value.length > 0 ||
      showUniqueCards.value ||
      selectedPowers.value.length > 0 ||
      powerRange.value.some((v) => v !== null) ||
      showTriggerSoul.value ||
      selectedSoul.value.length > 0
    )
  )

  // --- Worker Management ---
  let workerInstance = null
  let workerApiInstance = null
  let workerReadyPromise = null
  let resolveWorkerReady = null

  // Used to track the latest request and ignore stale results
  let lastRequestId = 0
  // Tracks the last keyword query synced into the worker's keywordResultsCache
  let syncedKeywordKey = ''
  // Deferred effect index files (lazy-loaded only when a keyword search targets 'effect')
  let deferredEffectIndexFiles = null
  let effectIndexLoadPromise = null

  const splitIndexFiles = (indexFiles) => {
    if (!indexFiles) return { eagerIndexFiles: null, effectIndexFiles: null }
    const eagerIndexFiles = {}
    const effectIndexFiles = {}
    for (const [key, val] of Object.entries(indexFiles)) {
      if (key.startsWith('effect.')) {
        effectIndexFiles[key] = val
      } else {
        eagerIndexFiles[key] = val
      }
    }
    return {
      eagerIndexFiles: Object.keys(eagerIndexFiles).length > 0 ? eagerIndexFiles : null,
      effectIndexFiles: Object.keys(effectIndexFiles).length > 0 ? effectIndexFiles : null,
    }
  }

  const getKeywordQueryKey = () => {
    const kw = keyword.value
    if (!kw || kw.length < 2) return ''
    return `${kw}\0${searchMode.value}\0${searchTargets.value.join(',')}`
  }

  const clearResults = () => {
    totalMatchedCount.value = 0
    workerResults.value = []
  }

  const finishWorkerReady = () => {
    if (resolveWorkerReady) {
      resolveWorkerReady()
      resolveWorkerReady = null
    }
    workerReadyPromise = null
  }

  /**
   * Initializes or returns the worker instance
   */
  const ensureWorker = () => {
    if (!workerInstance) {
      workerInstance = new FilterWorker()
      workerApiInstance = wrap(workerInstance)
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
   * Preloads and decompresses pre-built index buffers in the ephemeral brotli worker.
   * @param {Record<string, string | string[]>} [indexFiles]
   * @returns {Promise<Record<string, Uint8Array> | null>}
   */
  const preloadIndexBuffers = async (indexFiles) => {
    if (!indexFiles || Object.keys(indexFiles).length === 0) return null
    try {
      return await decompressBrotliMapInWorker(indexFiles)
    } catch (e) {
      console.error('❌ Error loading pre-built indexes, falling back to client-side indexing:', e)
      return null
    }
  }

  /**
   * Initializes the worker with card data and options
   */
  const initializeWorker = async (cards, options) => {
    const api = ensureWorker()
    finishWorkerReady()
    deferredEffectIndexFiles = null
    effectIndexLoadPromise = null
    const readyPromise = new Promise((resolve) => {
      resolveWorkerReady = resolve
    })
    workerReadyPromise = readyPromise
    const isCurrentInit = () => workerApiInstance === api && workerReadyPromise === readyPromise

    try {
      if (cards && cards.length > 0) {
        const rawOptions = toRaw(options) || {}
        const { eagerIndexFiles, effectIndexFiles } = splitIndexFiles(toRaw(rawOptions.indexFiles))
        const prebuiltIndexBuffers = await preloadIndexBuffers(eagerIndexFiles)
        // Abort stale init if terminateWorker() or another init ran while decompressing
        if (!isCurrentInit()) return

        const transferables = prebuiltIndexBuffers
          ? [...new Set(Object.values(prebuiltIndexBuffers).map((bytes) => bytes.buffer))]
          : []
        const workerOptions = {
          game: rawOptions.game,
          version: rawOptions.version,
          prebuiltIndexBuffers,
        }
        const payload =
          transferables.length > 0 ? transfer(workerOptions, transferables) : workerOptions

        const usedPrebuilt = await api.init(toRaw(cards), payload)
        cards = null
        if (!isCurrentInit()) return

        deferredEffectIndexFiles = usedPrebuilt ? effectIndexFiles : null
        syncedKeywordKey = ''
        finishWorkerReady()
        // Trigger initial filtering after worker is ready (skip if active filter is required)
        if (!requireActiveFilter || hasActiveFilters.value) {
          await runFilterQuery()
        } else {
          lastRequestId++
          clearResults()
        }
      } else {
        finishWorkerReady()
        lastRequestId++
        clearResults()
      }
    } finally {
      if (workerReadyPromise === readyPromise) {
        finishWorkerReady()
      }
    }
  }

  const getAttributeFiltersPayload = () => ({
    selectedCardTypes: toRaw(selectedCardTypes.value),
    selectedColors: toRaw(selectedColors.value),
    selectedProductName: toRaw(selectedProductName.value),
    selectedTraits: toRaw(selectedTraits.value),
    selectedLevels: toRaw(selectedLevels.value),
    selectedRarities: toRaw(selectedRarities.value),
    showUniqueCards: toRaw(showUniqueCards.value),
    selectedCosts: toRaw(selectedCosts.value),
    selectedPowers: toRaw(selectedPowers.value),
    powerRange: toRaw(powerRange.value),
    showTriggerSoul: toRaw(showTriggerSoul.value),
    selectedSoul: toRaw(selectedSoul.value),
  })

  const applyWorkerFilterResult = (results) => {
    if (results && !Array.isArray(results) && Array.isArray(results.items)) {
      totalMatchedCount.value = results.totalCount
      workerResults.value = results.items
    } else {
      const list = Array.isArray(results) ? results : []
      totalMatchedCount.value = list.length
      workerResults.value = list
    }
  }

  const ensureEffectIndexLoaded = async (api) => {
    if (!deferredEffectIndexFiles) return
    if (!effectIndexLoadPromise) {
      const filesToLoad = deferredEffectIndexFiles
      const run = (async () => {
        const buffers = await preloadIndexBuffers(filesToLoad)
        if (workerApiInstance !== api) return
        const transferables = buffers
          ? [...new Set(Object.values(buffers).map((bytes) => bytes.buffer))]
          : []
        const imported =
          buffers && Object.keys(buffers).length > 0
            ? await api.importIndexBuffers(
                transferables.length > 0 ? transfer(buffers, transferables) : buffers
              )
            : false
        if (workerApiInstance !== api) return
        if (!imported) {
          await api.rebuildClientIndex()
        }
        if (workerApiInstance === api) {
          deferredEffectIndexFiles = null
        }
      })().finally(() => {
        if (effectIndexLoadPromise === run) {
          effectIndexLoadPromise = null
        }
      })
      effectIndexLoadPromise = run
    }
    await effectIndexLoadPromise
  }

  /**
   * Syncs keyword query into the worker whenever it differs from the worker's cache,
   * then runs attribute filtering.
   */
  const runFilterQuery = async () => {
    const requestId = ++lastRequestId
    if (requireActiveFilter && !hasActiveFilters.value) {
      clearResults()
      return
    }
    if (workerReadyPromise) await workerReadyPromise
    const api = workerApiInstance
    if (!api || requestId !== lastRequestId) return

    const limitArg = Number.isFinite(maxResults) ? maxResults : undefined
    try {
      const targetKeywordKey = getKeywordQueryKey()
      if (targetKeywordKey !== syncedKeywordKey) {
        const kw = toRaw(keyword.value)
        const activeKw = kw && kw.length >= 2 ? kw : null
        const targets = toRaw(searchTargets.value)
        const needsEffectIndex =
          Boolean(activeKw) && (targets.length === 0 || targets.includes('effect'))
        if (needsEffectIndex && deferredEffectIndexFiles) {
          await ensureEffectIndexLoaded(api)
          if (workerApiInstance !== api || requestId !== lastRequestId) return
        }
        await api.searchByKeyword(activeKw, toRaw(searchMode.value), targets)
        if (workerApiInstance !== api) return
        syncedKeywordKey = targetKeywordKey
        if (requestId !== lastRequestId) return
      }
      const results = await api.filterByAttributes(getAttributeFiltersPayload(), limitArg)
      if (workerApiInstance === api && requestId === lastRequestId) {
        applyWorkerFilterResult(results)
      }
    } catch (error) {
      console.error('Error applying card filters:', error)
    }
  }

  /**
   * Terminates the worker and cleans up resources
   */
  const terminateWorker = () => {
    finishWorkerReady()
    syncedKeywordKey = ''
    deferredEffectIndexFiles = null
    effectIndexLoadPromise = null
    if (workerInstance) {
      workerInstance.terminate()
      workerInstance = null
      workerApiInstance = null
      lastRequestId++
      clearResults()
    }
  }

  // --- Watchers ---
  // 监听关键字变更：重新执行 FlexSearch 关键字搜索并叠加属性筛选
  watch(keyword, () => {
    runFilterQuery()
  })

  // 监听搜索模式与搜索字段切换：仅当关键字达到最小有效长度时重新执行关键字搜索
  watch([searchMode, searchTargets], () => {
    if ((keyword.value || '').length < 2) return
    runFilterQuery()
  })

  // 监听所有属性筛选条件变更：按需同步关键字缓存并重算属性筛选结果
  watch(
    [
      selectedCardTypes,
      selectedColors,
      selectedProductName,
      selectedTraits,
      selectedLevels,
      selectedCosts,
      selectedRarities,
      showUniqueCards,
      selectedPowers,
      powerRange,
      showTriggerSoul,
      selectedSoul,
    ],
    () => {
      runFilterQuery()
    }
  )

  /**
   * Resets all filter values to their defaults
   */
  const resetFilters = () => {
    keyword.value = null
    searchMode.value = 'precise'
    searchTargets.value = []
    selectedCardTypes.value = []
    selectedColors.value = []
    selectedProductName.value = null
    selectedTraits.value = []
    selectedLevels.value = []
    selectedCosts.value = []
    selectedRarities.value = []
    showUniqueCards.value = false
    selectedPowers.value = []
    powerRange.value = [null, null]
    showTriggerSoul.value = false
    selectedSoul.value = []
  }

  /**
   * Gets a single card by its ID from the worker
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  const getCardById = async (id) => {
    if (workerReadyPromise) await workerReadyPromise
    if (!workerApiInstance) return null
    try {
      return await workerApiInstance.getCardById(id)
    } catch (e) {
      console.error('Error fetching card by id from worker:', e)
      return null
    }
  }

  return {
    // State
    keyword,
    searchMode,
    searchTargets,
    selectedCardTypes,
    selectedColors,
    selectedProductName,
    selectedTraits,
    selectedLevels,
    selectedCosts,
    selectedRarities,
    showUniqueCards,
    selectedPowers,
    powerRange,
    showTriggerSoul,
    selectedSoul,
    // Getters
    filteredCards,
    totalMatchedCount,
    hasActiveFilters,
    // Actions
    resetFilters,
    terminateWorker,
    initializeWorker,
    processRawDataInWorker,
    getCardById,
  }
}
