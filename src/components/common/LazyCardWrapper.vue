<template>
  <div ref="rootEl" class="lazy-card-wrapper" :style="{ height: wrapperHeight }">
    <div v-if="hasMounted" v-show="shouldRender" class="content-container">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  minHeight: {
    type: [Number, String],
    default: 320,
  },
  buffer: {
    type: [String, Number],
    default: 'auto',
  },
})

const rootEl = ref(null)
const shouldRender = ref(false)
const hasMounted = ref(false)
const wrapperHeight = ref(
  typeof props.minHeight === 'number' ? `${props.minHeight}px` : props.minHeight
)

let observer = null

onMounted(() => {
  if (!rootEl.value) return

  let margin = props.buffer
  if (margin === 'auto') {
    const halfHeight = Math.round(window.innerHeight / 2)
    margin = `${halfHeight}px`
  } else if (typeof margin === 'number') {
    margin = `${margin}px`
  }

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting) {
        hasMounted.value = true
        shouldRender.value = true
        // Allow the content to determine the height naturally when visible
        wrapperHeight.value = 'auto'
      } else {
        // Only hide if we were previously rendering (to capture height)
        if (shouldRender.value) {
          // Capture the exact height before hiding to preserve scroll space
          const currentHeight = entry.target.getBoundingClientRect().height
          if (currentHeight > 10) {
            wrapperHeight.value = `${currentHeight}px`
          }
          shouldRender.value = false
        }
      }
    },
    {
      rootMargin: `${margin} 0px ${margin} 0px`,
      threshold: 0,
    }
  )

  observer.observe(rootEl.value)
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})
</script>

<style scoped>
.lazy-card-wrapper {
  width: 100%;
  contain: layout paint;
}
.content-container {
  display: contents;
}
</style>
