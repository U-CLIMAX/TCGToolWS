import { ref } from 'vue'

export const useDevice = () => {
  const isTouch = ref(false)

  const checkTouch = () => {
    if (typeof window === 'undefined') return false

    // Primary input is a coarse pointer (e.g. finger)
    const coarse = window.matchMedia('(pointer: coarse)').matches

    // Any fine pointer exists (e.g. mouse, trackpad, stylus)
    const fine = window.matchMedia('(any-pointer: fine)').matches

    // Any input device supports hover
    const hover = window.matchMedia('(any-hover: hover)').matches

    // Treat as touch-only device:
    // - Primary pointer is touch
    // - No fine pointer is available
    // - No device supports hover
    return coarse && !fine && !hover
  }

  isTouch.value = checkTouch()

  return { isTouch }
}
