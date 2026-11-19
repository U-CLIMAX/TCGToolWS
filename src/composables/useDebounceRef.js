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
      if (newVal === null || newVal === '') {
        if (val !== newVal) {
          val = newVal
          trigger()
        }
        return
      }
      timer = setTimeout(() => {
        val = newVal
        trigger()
      }, delay)
    },
  }))
}
