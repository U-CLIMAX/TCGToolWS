import { ref, shallowRef, computed } from 'vue'
import { defineStore } from 'pinia'
import localforage from 'localforage'

const backgroundStore = localforage.createInstance({
  name: 'ui-background',
})

const BACKGROUND_IMAGE_KEY = 'background-image'

export const useUIStore = defineStore(
  'ui',
  () => {
    const version = ref(1)
    const theme = ref('dark')
    const isFilterOpen = ref(false)
    const isCardDeckOpen = ref(false)
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

    // State for SeriesCardTableView
    const seriesSearchTerm = ref('')
    const seriesSortBy = ref('date') // 'date' or 'name'
    const seriesSortAscending = ref(false)
    const seriesGameFilter = ref('ws')

    const backgroundImage = ref(null)

    const menuProps = computed(() => {
      const classes = ['themed-scrollbar']
      if (backgroundImage.value) {
        classes.unshift('glass-menu')
      }
      return { contentClass: classes.join(' ') }
    })

    const restoreBackgroundImage = async () => {
      const storedImage = await backgroundStore.getItem(BACKGROUND_IMAGE_KEY)
      if (storedImage) {
        backgroundImage.value = storedImage
      }
    }

    const setLoading = (status) => {
      isLoading.value = status
    }

    const setRenderedCardsCount = (count) => {
      renderedCardsCount.value = count
    }

    const setPerformanceMode = (updates) => {
      if (typeof updates === 'object' && updates !== null) {
        isPerformanceMode.value = { ...isPerformanceMode.value, ...updates }
      } else {
        console.warn('setPerformanceMode expects an object with performance flags.')
      }
    }

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

    const updateBackgroundImage = (updates) => {
      if (!backgroundImage.value) return
      const updatedImage = { ...backgroundImage.value, ...updates }
      backgroundImage.value = updatedImage
      backgroundStore.setItem(BACKGROUND_IMAGE_KEY, updatedImage)
    }

    const clearBackgroundImage = () => {
      backgroundImage.value = null
      backgroundStore.removeItem(BACKGROUND_IMAGE_KEY)
    }

    // Update website
    const showForceUpdate = ref(false)
    const pollingWorker = shallowRef(null)

    const triggerForceUpdate = (worker) => {
      pollingWorker.value = worker
      showForceUpdate.value = true
    }

    const confirmUpdate = () => {
      if (pollingWorker.value) {
        pollingWorker.value.onRefresh()
      } else {
        window.location.reload()
      }
    }

    return {
      version,
      theme,
      isFilterOpen,
      isCardDeckOpen,
      isLoading,
      setLoading,
      isTableModeActive,
      performanceThreshold,
      isPerformanceMode,
      setPerformanceMode,
      renderedCardsCount,
      setRenderedCardsCount,
      useAdaptiveColor,
      showStatsDashboard,
      seriesSearchTerm,
      seriesSortBy,
      seriesSortAscending,
      seriesGameFilter,
      backgroundImage,
      setBackgroundImage,
      updateBackgroundImage,
      clearBackgroundImage,
      restoreBackgroundImage,
      menuProps,
      showForceUpdate,
      triggerForceUpdate,
      confirmUpdate,
    }
  },
  {
    persist: {
      storage: localStorage,
      omit: ['showForceUpdate', 'pollingWorker'],
    },
  }
)
