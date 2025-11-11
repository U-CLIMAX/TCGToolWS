import { ref, onMounted } from 'vue'

export const useDevice = () => {
  const isTouch = ref(false)

  onMounted(() => {
    // 檢查點 1: 瀏覽器是否報告支援至少一個觸控點
    // A non-touch device will report 0.
    const hasTouchPoints = navigator.maxTouchPoints > 0

    // 檢查點 2: 瀏覽器是否支援觸控事件
    // This is the classic check, though some modern desktops might emulate this.
    const hasTouchEvents = 'ontouchstart' in window

    // 檢查點 3: 媒體查詢是否至少有一個 "粗糙" (coarse) 的指標 (例如手指)
    // This directly checks for the presence of a finger-like pointer.
    const hasCoarsePointer = window.matchMedia('(any-pointer: coarse)').matches

    // 只要滿足任一條件 (OR ||)，我們就高度確信它是觸控裝置
    // 這種組合方式可以修正 Vivo 裝置的誤判
    isTouch.value = hasTouchPoints || hasTouchEvents || hasCoarsePointer
  })

  return { isTouch }
}
