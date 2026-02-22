import { customRef } from 'vue'

export const debounceRef = (val, delay = 1000) => {
  let timer
  return customRef((track, trigger) => ({
    get() {
      track()
      return val
    },
    set(newVal) {
      clearTimeout(timer)
      timer = setTimeout(() => {
        val = newVal
        trigger()
      }, delay)
    },
  }))
}
