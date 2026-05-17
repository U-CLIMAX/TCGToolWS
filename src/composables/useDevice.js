import { ref } from 'vue'

export const useDevice = () => {
  const isTouch = ref(false)

  const checkTouch = () => {
    if (typeof window === 'undefined') return false

    // Check 1: Browser reports at least one touch point
    const hasTouchPoints = navigator.maxTouchPoints > 0

    // Check 2: Browser supports touch events
    const hasTouchEvents = 'ontouchstart' in window

    // Check 3: Media query for at least one "coarse" pointer (e.g., finger)
    const hasCoarsePointer = window.matchMedia('(any-pointer: coarse)').matches

    return hasTouchPoints || hasTouchEvents || hasCoarsePointer
  }

  isTouch.value = checkTouch()

  return { isTouch }
}
