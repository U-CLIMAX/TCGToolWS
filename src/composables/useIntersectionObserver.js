import { onUnmounted } from 'vue'

export const useIntersectionObserver = (target, onIntersect, options = { threshold: 0.1 }) => {
  let observer

  const stop = () => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  const start = () => {
    stop() // Ensure any previous observer is disconnected

    if (target.value) {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          onIntersect(entry.target)
        }
      }, options)

      observer.observe(target.value)
    }
  }

  onUnmounted(stop)

  return {
    start,
    stop,
  }
}
