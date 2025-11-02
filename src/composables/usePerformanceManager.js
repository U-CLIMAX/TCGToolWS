import { watch, computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { storeToRefs } from 'pinia'

export const usePerformanceManager = () => {
  const uiStore = useUIStore()
  const { performanceThreshold, renderedCardsCount, isPerformanceMode } = storeToRefs(uiStore)

  const shouldBePerformanceMode = computed(() => {
    const threshold = performanceThreshold.value
    if (threshold === 0) {
      return { sideBarAnimSimp: true, infScrollResetOpti: true }
    }
    if (threshold < 0) {
      return { sideBarAnimSimp: false, infScrollResetOpti: false }
    }

    const renderedCount = renderedCardsCount.value
    return {
      sideBarAnimSimp: renderedCount > threshold,
      infScrollResetOpti: renderedCount > parseInt(threshold / 3, 10),
    }
  })

  watch(
    shouldBePerformanceMode,
    (newMode) => {
      const currentMode = isPerformanceMode.value
      if (
        currentMode.sideBarAnimSimp !== newMode.sideBarAnimSimp ||
        currentMode.infScrollResetOpti !== newMode.infScrollResetOpti
      ) {
        uiStore.setPerformanceMode(newMode)
      }
    },
    { immediate: true, deep: true }
  )
}
