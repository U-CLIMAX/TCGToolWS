<template>
  <v-fade-transition>
    <div v-if="isExpanded" class="overlay" @click="collapse"></div>
  </v-fade-transition>
  <div
    v-bind="$attrs"
    ref="draggableContainer"
    class="floating-search-container"
    :style="containerStyle"
    @touchstart="startDrag"
  >
    <div :class="['search-wrapper', { 'is-expanded': isExpanded }]" v-click-outside="collapse">
      <v-text-field
        ref="inputRef"
        v-model="localSearchTerm"
        class="search-input"
        placeholder="系列名称、番号"
        variant="plain"
        density="compact"
        hide-details
        single-line
        @keydown.enter="collapse"
      />
      <v-btn class="search-button" icon variant="text" @mousedown="startDrag" @click="handleTap">
        <v-icon>mdi-magnify</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { debounce } from 'es-toolkit'

const uiStore = useUIStore()
const updateStoreTerm = debounce((val) => {
  uiStore.seriesSearchTerm = val
}, 300)

const localSearchTerm = computed({
  get: () => uiStore.seriesSearchTerm,
  set: (val) => {
    updateStoreTerm(val)
  },
})

const isExpanded = ref(false)
const inputRef = ref(null)

const draggableContainer = ref(null)
const position = ref({ x: 10, y: window.innerHeight * 0.13 })
const dragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const movedDuringDrag = ref(false)

const containerStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px)`,
}))

onMounted(() => {
  if (draggableContainer.value) {
    position.value = {
      x: 10,
      y: window.innerHeight * 0.13,
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', drag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', drag)
  window.removeEventListener('touchend', stopDrag)
})

const startDrag = (event) => {
  // Prevent dragging when clicking on the input field
  if (isExpanded.value) {
    return
  }
  movedDuringDrag.value = false
  dragging.value = true
  document.body.style.cursor = 'grabbing'

  const clientX = event.type === 'touchstart' ? event.touches[0].clientX : event.clientX
  const clientY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY

  dragOffset.value = {
    x: clientX - position.value.x,
    y: clientY - position.value.y,
  }
  window.addEventListener('mousemove', drag)
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchmove', drag, { passive: false })
  window.addEventListener('touchend', stopDrag, { passive: false })
}

const drag = (event) => {
  if (dragging.value) {
    event.preventDefault()
    document.body.style.pointerEvents = 'none'
    movedDuringDrag.value = true
    const parentRect = draggableContainer.value.parentElement.getBoundingClientRect()

    const clientX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX
    const clientY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY

    const newX = clientX - dragOffset.value.x
    const newY = clientY - dragOffset.value.y

    const elRect = draggableContainer.value.getBoundingClientRect()

    position.value.x = Math.max(0, Math.min(newX, parentRect.width - elRect.width))
    position.value.y = Math.max(0, Math.min(newY, parentRect.height - elRect.height))
  }
}

const stopDrag = () => {
  dragging.value = false
  document.body.style.cursor = 'auto'
  document.body.style.pointerEvents = 'auto'
  window.removeEventListener('mousemove', drag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', drag, { passive: false })
  window.removeEventListener('touchend', stopDrag, { passive: false })
}

const collapse = () => {
  isExpanded.value = false
}

const toggleExpand = async () => {
  if (movedDuringDrag.value) {
    return
  }
  if (isExpanded.value && !localSearchTerm.value) {
    isExpanded.value = false
  } else if (!isExpanded.value) {
    const expandedWidth = 350
    if (draggableContainer.value) {
      const parentRect = draggableContainer.value.parentElement.getBoundingClientRect()
      const viewportWidth = parentRect.width

      if (position.value.x + expandedWidth > viewportWidth) {
        position.value.x = viewportWidth - expandedWidth
      }
      // Ensure it doesn't go off the left edge either
      position.value.x = Math.max(0, position.value.x)
    }

    isExpanded.value = true
    await nextTick()
    inputRef.value?.focus()
  } else {
    collapse()
  }
}

const handleTap = () => {
  if (movedDuringDrag.value) {
    return
  }

  if (!isExpanded.value) {
    toggleExpand()
  } else {
    collapse()
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 999;
}

.floating-search-container {
  position: absolute;
  z-index: 1000;
  cursor: grab;
}

.search-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--search-btn-bg);
  overflow: hidden;
  cursor: pointer;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 0 0 1px var(--search-btn-glow),
    0 0 20px var(--search-btn-glow);
  transition: all 0.4s cubic-bezier(0.6, 0.05, 0.28, 0.91);
}

.search-wrapper.is-expanded {
  width: 350px;
  border-radius: 28px;
  background-color: var(--search-btn-bg-expanded);
  cursor: default;
  justify-content: flex-start;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 0 0 1px var(--search-btn-glow-expanded),
    0 0 15px var(--search-btn-glow-expanded);
}

.search-wrapper:hover {
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.2),
    0 0 0 1px var(--search-btn-glow),
    0 0 30px var(--search-btn-glow);
}

.search-wrapper.is-expanded:hover {
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.2),
    0 0 0 1px var(--search-btn-glow-expanded),
    0 0 25px var(--search-btn-glow-expanded);
}

.search-input {
  flex-grow: 1;
  opacity: 0;
  pointer-events: none;
  width: 0;
  padding: 0;
  margin: 0;
  transition: all 0.2s ease-in-out;
  transition-delay: 0.1s;
}

.search-wrapper.is-expanded .search-input {
  opacity: 1;
  pointer-events: auto;
  width: auto;
  padding-left: 20px;
}

.search-button {
  flex-shrink: 0;
  margin: 4px;
  color: var(--search-btn-icon) !important;
}

.search-wrapper.is-expanded .search-button {
  color: var(--search-btn-icon-expanded) !important;
}

.search-input :deep(.v-field__input) {
  padding-top: 0 !important;
}
</style>
