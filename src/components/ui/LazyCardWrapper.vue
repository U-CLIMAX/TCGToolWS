<template>
  <div ref="rootEl" class="lazy-card-wrapper" :style="wrapperStyle">
    <div v-if="shouldRender" class="content-container">
      <slot></slot>
    </div>
  </div>
</template>

<script>
import { shallowRef } from 'vue'

// ==========================================
// Module-level cache & singleton IntersectionObserver
// ==========================================
const globalViewportKey = {}
const observerCache = new WeakMap()

/**
 * Static intersection handler shared across all instances
 * @param {IntersectionObserverEntry} entry
 * @param {object} state
 */
const handleIntersection = (entry, state) => {
  const measuredHeight = entry.boundingClientRect.height

  if (entry.isIntersecting) {
    if (state.destroyTimeout) {
      clearTimeout(state.destroyTimeout)
      state.destroyTimeout = null
    }
    state.shouldRender.value = true

    if (measuredHeight > 20) {
      state.exactHeight.value = measuredHeight
      if (state.observerEntry) {
        state.observerEntry.learnedHeight.value = measuredHeight
      }
    }
  } else {
    // Exiting viewport
    if (state.shouldRender.value && !state.destroyTimeout) {
      if (measuredHeight > 20) {
        state.exactHeight.value = measuredHeight
        if (state.observerEntry) {
          state.observerEntry.learnedHeight.value = measuredHeight
        }
      }

      state.destroyTimeout = setTimeout(() => {
        state.shouldRender.value = false
        state.destroyTimeout = null
      }, state.destroyDelay)
    }
  }
}

const getOrCreateObserver = (root) => {
  const key = root || globalViewportKey
  let observerEntry = observerCache.get(key)
  if (!observerEntry) {
    const targets = new Map()
    const learnedHeight = shallowRef(0)
    const observer = new IntersectionObserver(
      (entries) => {
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i]
          const state = targets.get(entry.target)
          if (state) {
            handleIntersection(entry, state)
          }
        }
      },
      {
        root,
        rootMargin: '30% 0px 30% 0px',
        threshold: 0,
      }
    )
    observerEntry = { observer, targets, learnedHeight }
    observerCache.set(key, observerEntry)
  }
  return observerEntry
}

const observeElement = (root, element, state) => {
  const entry = getOrCreateObserver(root)
  state.observerEntry = entry
  entry.targets.set(element, state)
  entry.observer.observe(element)
  return entry
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
import { ref, shallowRef, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  minHeight: {
    type: [Number, String],
    default: 80,
  },
  destroyDelay: {
    type: Number,
    default: 200,
  },
})

const rootEl = ref(null)
const shouldRender = ref(false)
const exactHeight = shallowRef(0)
const observerEntryRef = shallowRef(null)

const state = {
  shouldRender,
  destroyTimeout: null,
  destroyDelay: props.destroyDelay,
  exactHeight,
  observerEntry: null,
}

let activeRoot = null

const wrapperStyle = computed(() => {
  if (shouldRender.value) {
    return {
      height: 'auto',
    }
  }
  const h = exactHeight.value || observerEntryRef.value?.learnedHeight.value || props.minHeight
  const heightStr = typeof h === 'number' ? `${h}px` : h
  return {
    height: heightStr,
    minHeight: heightStr,
  }
})

/**
 * Helper to find the nearest scrollable parent
 * @param {HTMLElement | null} element
 * @returns {HTMLElement | null}
 */
const getScrollParent = (element) => {
  if (!element) return null

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

onMounted(() => {
  if (!rootEl.value) return

  activeRoot = getScrollParent(rootEl.value)
  const entry = observeElement(activeRoot, rootEl.value, state)
  observerEntryRef.value = entry
})

onUnmounted(() => {
  if (state.destroyTimeout) {
    clearTimeout(state.destroyTimeout)
    state.destroyTimeout = null
  }
  if (rootEl.value) {
    unobserveElement(activeRoot, rootEl.value)
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
