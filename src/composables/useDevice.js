import { ref, onMounted } from 'vue'

export const useDevice = () => {
  const isTouch = ref(false)

  onMounted(() => {
    // Check 1: Browser reports at least one touch point
    // A non-touch device will report 0.
    const hasTouchPoints = navigator.maxTouchPoints > 0

    // Check 2: Browser supports touch events
    // Classic check, though some modern desktops might emulate this.
    const hasTouchEvents = 'ontouchstart' in window

    // Check 3: Media query for at least one "coarse" pointer (e.g., finger)
    // Directly checks for the presence of a finger-like pointer.
    const hasCoarsePointer = window.matchMedia('(any-pointer: coarse)').matches

    // If any condition is met, it's highly likely a touch device.
    // This combination fixes misidentification on certain devices (e.g., Vivo).
    isTouch.value = hasTouchPoints || hasTouchEvents || hasCoarsePointer
  })

  return { isTouch }
}
