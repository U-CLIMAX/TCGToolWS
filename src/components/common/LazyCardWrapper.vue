<template>
  <div ref="rootEl" class="lazy-card-wrapper" :style="{ height: wrapperHeight }">
    <div v-if="shouldRender" class="content-container">
      <slot></slot>
    </div>
  </div>
</template>

<script>
// Module-level cache to share IntersectionObserver instances across all LazyCardWrapper components
const globalViewportKey = {}
const observerCache = new WeakMap()

const getOrCreateObserver = (root) => {
  const key = root || globalViewportKey
  let observerEntry = observerCache.get(key)
  if (!observerEntry) {
    const targets = new Map()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const callback = targets.get(entry.target)
          if (callback) {
            callback(entry)
          }
        }
      },
      {
        root,
        rootMargin: '150% 0px 150% 0px',
        threshold: 0,
      }
    )
    observerEntry = { observer, targets }
    observerCache.set(key, observerEntry)
  }

  return observerEntry
}

const observeElement = (root, element, callback) => {
  const { observer, targets } = getOrCreateObserver(root)
  targets.set(element, callback)
  observer.observe(element)
}

const unobserveElement = (root, element) => {
  const key = root || globalViewportKey
  const observerEntry = observerCache.get(key)
  if (!observerEntry) return

  const { observer, targets } = observerEntry
  targets.delete(element)
  observer.unobserve(element)

  if (targets.size === 0) {
    observer.disconnect()
    observerCache.delete(key)
  }
}
</script>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  minHeight: {
    type: [Number, String],
    default: 320,
  },
  destroyDelay: {
    type: Number,
    default: 2000,
  },
})

const rootEl = ref(null)
const shouldRender = ref(false)
const wrapperHeight = ref(
  typeof props.minHeight === 'number' ? `${props.minHeight}px` : props.minHeight
)

/**
 * Helper to find the nearest scrollable parent
 * @param {HTMLElement | null} element
 * @returns {HTMLElement | null}
 */
const getScrollParent = (element) => {
  if (!element) return null

  // Prioritize finding explicit infinite scroll or scrollbar containers
  const scrollContainer = element.closest('.v-infinite-scroll, .themed-scrollbar')
  if (scrollContainer) return scrollContainer

  let parent = element.parentElement
  while (parent) {
    const style = window.getComputedStyle(parent)
    const overflowY = style.overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent
    }
    parent = parent.parentElement
  }
  return null
}

let activeRoot = null
let observedElement = null
let destroyTimeout = null

onMounted(() => {
  if (!rootEl.value) return

  activeRoot = getScrollParent(rootEl.value)
  observedElement = rootEl.value

  observeElement(activeRoot, observedElement, (entry) => {
    if (entry.isIntersecting) {
      if (destroyTimeout) {
        clearTimeout(destroyTimeout)
        destroyTimeout = null
      }
      shouldRender.value = true
      wrapperHeight.value = 'auto'
    } else {
      // Only hide if we were previously rendering (to capture height)
      if (shouldRender.value && !destroyTimeout) {
        // Capture the exact height before hiding to preserve scroll space
        const currentHeight = entry.target.getBoundingClientRect().height
        if (currentHeight > 10) {
          wrapperHeight.value = `${currentHeight}px`
        }

        destroyTimeout = setTimeout(() => {
          shouldRender.value = false
          destroyTimeout = null
        }, props.destroyDelay)
      }
    }
  })
})

onUnmounted(() => {
  if (destroyTimeout) {
    clearTimeout(destroyTimeout)
    destroyTimeout = null
  }
  if (observedElement) {
    unobserveElement(activeRoot, observedElement)
  }
})
</script>

<style scoped>
.lazy-card-wrapper {
  width: 100%;
  contain: layout;
}
.content-container {
  display: contents;
}
</style>
