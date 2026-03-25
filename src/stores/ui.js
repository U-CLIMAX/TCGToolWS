import { ref, shallowRef, computed } from 'vue'
import { defineStore } from 'pinia'
import localforage from 'localforage'
import { debounceRef } from '@/composables/useDebounceRef'

const backgroundStore = localforage.createInstance({
  name: 'ui-background',
})

const BACKGROUND_IMAGE_KEY = 'background-image'

export const useUIStore = defineStore(
  'ui',
  () => {
    // --- State ---
    const version = ref(1)
    const theme = ref('dark')
    const isFilterOpen = ref(false)
    const isCardDeckOpen = ref(false)
    const isCardDetailModalOpen = ref(false)
    const isLoading = ref(false)
    const isTableModeActive = ref(false)
    const performanceThreshold = ref(600)
    const isPerformanceMode = ref({
      sideBarAnimSimp: false,
      infScrollResetOpti: false,
    })
    const renderedCardsCount = ref(0)
    const useAdaptiveColor = ref(true)
    const showStatsDashboard = ref(true)
    const customKeywords = ref([])
    const headerHeight = ref(64) // Default height
    const backgroundImage = ref(null)

    // State for SeriesCardTableView
    const seriesSearchTerm = debounceRef('', 300)
    const seriesSortBy = ref('date') // 'date' or 'name'
    const seriesSortAscending = ref(false)
    const selectedGameType = ref('ws')

    // Update website
    const showForceUpdate = ref(false)
    const pollingWorker = shallowRef(null)

    // --- Computed ---

    /**
     * Computed properties for menu configuration based on background state
     */
    const menuProps = computed(() => {
      const classes = ['themed-scrollbar', 'rounded-xl']
      if (backgroundImage.value) {
        classes.unshift('glass-menu')
      }
      return { contentClass: classes.join(' '), offset: 3 }
    })

    const menuPropsNoGlass = computed(() => {
      return { contentClass: 'themed-scrollbar' }
    })

    // --- Actions ---

    /**
     * Restores background image from persistent storage
     */
    const restoreBackgroundImage = async () => {
      const storedImage = await backgroundStore.getItem(BACKGROUND_IMAGE_KEY)
      if (storedImage) {
        backgroundImage.value = storedImage
      }
    }

    /**
     * Sets the global loading state
     * @param {boolean} status
     */
    const setLoading = (status) => {
      isLoading.value = status
    }

    /**
     * Updates the count of rendered cards (for performance monitoring)
     * @param {number} count
     */
    const setRenderedCardsCount = (count) => {
      renderedCardsCount.value = count
    }

    /**
     * Updates performance optimization flags
     * @param {object} updates
     */
    const setPerformanceMode = (updates) => {
      if (typeof updates === 'object' && updates !== null) {
        isPerformanceMode.value = { ...isPerformanceMode.value, ...updates }
      } else {
        console.warn('setPerformanceMode expects an object with performance flags.')
      }
    }

    /**
     * Sets a custom header height based on layout changes
     * @param {number} height
     */
    const setHeaderHeight = (height) => {
      headerHeight.value = height
    }

    /**
     * Sets a new background image from a canvas element
     * @param {object} options
     * @param {HTMLCanvasElement} options.canvas
     */
    const setBackgroundImage = ({ canvas }) => {
      if (!canvas) return
      let dataURL = canvas.toDataURL('image/webp', 0.9)

      const sizeInBytes = dataURL.length * 0.75
      const sizeInMB = sizeInBytes / (1024 * 1024)

      if (sizeInMB > 2) {
        dataURL = canvas.toDataURL('image/webp', 0.6)
      }

      const newImage = {
        src: dataURL,
        width: canvas.width,
        height: canvas.height,
        maskOpacity: 0.3,
        blur: 0,
        size: 'cover',
      }
      backgroundImage.value = newImage
      backgroundStore.setItem(BACKGROUND_IMAGE_KEY, newImage)
    }

    /**
     * Updates properties of the current background image
     * @param {object} updates
     */
    const updateBackgroundImage = (updates) => {
      if (!backgroundImage.value) return
      const updatedImage = { ...backgroundImage.value, ...updates }
      backgroundImage.value = updatedImage
      backgroundStore.setItem(BACKGROUND_IMAGE_KEY, updatedImage)
    }

    /**
     * Clears the background image from state and storage
     */
    const clearBackgroundImage = () => {
      backgroundImage.value = null
      backgroundStore.removeItem(BACKGROUND_IMAGE_KEY)
    }

    /**
     * Triggers a force update notification
     * @param {object} worker - Service worker instance
     */
    const triggerForceUpdate = (worker) => {
      pollingWorker.value = worker
      showForceUpdate.value = true
    }

    /**
     * Confirms and applies the website update
     */
    const confirmUpdate = () => {
      if (pollingWorker.value) {
        pollingWorker.value.onRefresh()
      } else {
        window.location.reload()
      }
    }

    /**
     * Adds a custom search keyword to history
     * @param {string} keyword
     */
    const addCustomKeyword = (keyword) => {
      if (keyword && !customKeywords.value.includes(keyword)) {
        customKeywords.value.unshift(keyword)
      }
    }

    /**
     * Removes a custom search keyword from history
     * @param {string} keyword
     */
    const removeCustomKeyword = (keyword) => {
      const index = customKeywords.value.indexOf(keyword)
      if (index > -1) {
        customKeywords.value.splice(index, 1)
      }
    }

    return {
      version,
      theme,
      isFilterOpen,
      isCardDeckOpen,
      isCardDetailModalOpen,
      isLoading,
      setLoading,
      headerHeight,
      setHeaderHeight,
      isTableModeActive,
      performanceThreshold,
      isPerformanceMode,
      setPerformanceMode,
      renderedCardsCount,
      setRenderedCardsCount,
      useAdaptiveColor,
      showStatsDashboard,
      customKeywords,
      addCustomKeyword,
      removeCustomKeyword,
      seriesSearchTerm,
      seriesSortBy,
      seriesSortAscending,
      selectedGameType,
      backgroundImage,
      setBackgroundImage,
      updateBackgroundImage,
      clearBackgroundImage,
      restoreBackgroundImage,
      menuProps,
      menuPropsNoGlass,
      showForceUpdate,
      triggerForceUpdate,
      confirmUpdate,
    }
  },
  {
    persist: {
      storage: localStorage,
      omit: ['showForceUpdate', 'pollingWorker', 'seriesSearchTerm', 'isCardDetailModalOpen'],
    },
  }
)
