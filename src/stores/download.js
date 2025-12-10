import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDownloadStore = defineStore(
  'download',
  () => {
    const textWidth = ref(800)
    const textBgColor = ref('#FFFFFF')
    const textColor = ref('#000000')
    const textBorderRadius = ref(16)
    const textFontSize = ref(20)
    const textLineHeight = ref(28)

    return {
      textWidth,
      textBgColor,
      textColor,
      textBorderRadius,
      textFontSize,
      textLineHeight,
    }
  },
  {
    persist: {
      storage: localStorage,
    },
  }
)
