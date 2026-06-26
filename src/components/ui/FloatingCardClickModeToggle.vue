<template>
  <div
    v-bind="$attrs"
    ref="draggableContainer"
    class="floating-toggle-container d-flex align-center elevation-4 opacity-90 rounded-pill bg-surface"
    :style="containerStyle"
  >
    <div
      class="drag-handle d-flex align-center justify-center cursor-grab"
      @touchstart.stop="startDrag"
      @mousedown.stop="startDrag"
    >
      <v-icon icon="i-mdi:drag-vertical" size="small" class="text-medium-emphasis mx-1" />
    </div>
    <v-btn-toggle
      v-model="uiStore.cardClickMode"
      density="compact"
      color="primary"
      variant="flat"
      rounded="pill"
      divided
      mandatory
      class="toggle-wrapper"
    >
      <v-btn value="remove" style="min-width: 0; padding: 0 16px">
        <v-icon icon="i-mdi:minus" style="transform: rotate(-90deg)" />
      </v-btn>
      <v-btn value="none" style="min-width: 0; padding: 0 16px">
        <v-icon icon="i-mdi:cursor-default-click-outline" style="transform: rotate(-90deg)" />
      </v-btn>
      <v-btn
        value="add"
        style="min-width: 0; padding: 0 16px"
        :disabled="deckStore.totalCardCount >= 50 && userRole === 0"
      >
        <v-icon icon="i-mdi:plus" />
      </v-btn>
    </v-btn-toggle>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/ui'
import { useDeckStore } from '@/stores/deck'
import { useAuthStore } from '@/stores/auth'

const uiStore = useUIStore()
const deckStore = useDeckStore()
const authStore = useAuthStore()
const { userRole } = storeToRefs(authStore)

const draggableContainer = ref(null)
const position = ref({ x: 0, y: 0 })
const dragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const containerStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px) rotate(90deg)`,
}))

onMounted(() => {
  if (draggableContainer.value) {
    requestAnimationFrame(() => {
      if (uiStore.floatingTogglePosition) {
        position.value = { ...uiStore.floatingTogglePosition }
      } else {
        const rect = draggableContainer.value?.getBoundingClientRect()
        if (!rect) return
        position.value = {
          x: window.innerWidth - rect.right - 5,
          y: (window.innerHeight - rect.height) * 0.4 - rect.top,
        }
      }
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', drag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', drag)
  window.removeEventListener('touchend', stopDrag)
})

const startDrag = (event) => {
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

    const clientX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX
    const clientY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY

    const newX = clientX - dragOffset.value.x
    const newY = clientY - dragOffset.value.y

    const elRect = draggableContainer.value.getBoundingClientRect()

    const minX = position.value.x - elRect.left
    const maxX = position.value.x + (window.innerWidth - elRect.right)
    const minY = position.value.y - elRect.top
    const maxY = position.value.y + (window.innerHeight - elRect.bottom)

    position.value.x = Math.max(minX, Math.min(newX, maxX))
    position.value.y = Math.max(minY, Math.min(newY, maxY))
  }
}

const stopDrag = () => {
  dragging.value = false
  document.body.style.cursor = 'auto'
  window.removeEventListener('mousemove', drag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', drag)
  window.removeEventListener('touchend', stopDrag)
  uiStore.floatingTogglePosition = { ...position.value }
}
</script>

<style scoped>
.floating-toggle-container {
  position: absolute;
  z-index: 1000;
  touch-action: none;
}
.drag-handle {
  height: 100%;
  padding-top: 4px;
  padding-bottom: 4px;
}
.drag-handle:active {
  cursor: grabbing;
}
.toggle-wrapper {
  pointer-events: auto;
  border-radius: 0 24px 24px 0 !important;
}
</style>
