import { defineStore } from 'pinia'
import { ref } from 'vue'

const MAX_RECENT_SERIES = 10

export const useRecentStore = defineStore(
  'recent',
  () => {
    const seriesIds = ref([])

    const addSeries = (seriesId) => {
      if (!seriesId) return

      const existingIndex = seriesIds.value.indexOf(seriesId)
      if (existingIndex > -1) {
        seriesIds.value.splice(existingIndex, 1)
      }
      seriesIds.value.unshift(seriesId)

      if (seriesIds.value.length > MAX_RECENT_SERIES) {
        seriesIds.value.pop()
      }
    }

    return {
      seriesIds,
      addSeries,
    }
  },
  {
    persist: {
      storage: localStorage,
    },
  }
)
