import { ref } from 'vue'

export const useDevice = () => {
  const isTouch = ref(false)

  const checkTouch = () => {
    if (typeof window === 'undefined') return false

    // Primary input is a coarse pointer (e.g. finger)
    const coarse = window.matchMedia('(pointer: coarse)').matches

    return coarse
  }

  isTouch.value = checkTouch()

  return { isTouch }
}
