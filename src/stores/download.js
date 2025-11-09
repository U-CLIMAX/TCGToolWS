import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDownloadStore = defineStore(
  'download',
  () => {
    const textWidth = ref(800)
    const textBgColor = ref('#FFFFFF')
    const textBorderRadius = ref(16)
    const textFontSize = ref(20)

    return {
      textWidth,
      textBgColor,
      textBorderRadius,
      textFontSize,
    }
  },
  {
    persist: {
      storage: localStorage,
    },
  }
)