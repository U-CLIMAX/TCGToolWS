<template>
  <div v-if="shouldRender" class="bottom-sheet-overlay">
    <v-card
      class="rounded-t-xl d-flex flex-column bottom-sheet-card"
      :class="{
        'glass-sheet': hasBackgroundImage,
        'is-snapping': !isDragging && !isAnimating,
      }"
      :style="{
        transform: `translateY(${sheetTranslateY}px)`,
        touchAction: 'none',
      }"
    >
      <!-- Header -->
      <div class="sheet-header" @mousedown="startDrag" @touchstart.prevent="startDrag">
        <div class="header-spacer-left"></div>
        <div class="header-drag-area">
          <div class="resize-handle"></div>
          <div class="pt-2">
            <slot name="header"></slot>
          </div>
        </div>
        <div class="header-close-area">
          <v-btn icon="mdi-close" variant="text" @click.stop="closeSheet" @touchstart.stop></v-btn>
        </div>
      </div>
      <v-divider></v-divider>

      <!-- Content -->
      <v-card-text
        class="pa-0 sheet-content"
        :style="{
          height: sheetContentHeight + 'px',
          overflowY: 'hidden',
          touchAction: 'pan-y',
        }"
      >
        <slot :contentHeight="sheetContentHeight"></slot>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBottomSheet } from '@/composables/useBottomSheet.js'
import { useUIStore } from '@/stores/ui'

const props = defineProps({
  content: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['update:content'])

const uiStore = useUIStore()
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

// Create a writable computed to sync the prop with the composable
const internalSheetContent = computed({
  get: () => props.content,
  set: (val) => emit('update:content', val),
})

const { shouldRender, sheetTranslateY, sheetContentHeight, isDragging, isAnimating, startDrag } =
  useBottomSheet(internalSheetContent)

const closeSheet = () => {
  internalSheetContent.value = null
}
</script>

<style scoped>
/* Bottom Sheet Overlay - Fixed position container */
.bottom-sheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  pointer-events: none;
}

/* Bottom Sheet Card */
.bottom-sheet-card {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100vh;
  pointer-events: auto;
  will-change: transform;
  transform: translateZ(0); /* GPU acceleration */
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.3);
}

/* Snapping animation - only enabled when not dragging or JS animating */
.bottom-sheet-card.is-snapping {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sheet-header {
  display: flex;
  align-items: center;
  width: 100%;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.sheet-header:active {
  cursor: grabbing;
}

.header-spacer-left {
  width: 56px;
}

.header-drag-area {
  flex-grow: 1;
  position: relative;
  padding: 12px 0;
  text-align: center;
}

.header-close-area {
  width: 56px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.resize-handle {
  width: 80px;
  height: 4px;
  background-color: grey;
  border-radius: 2px;
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
}

/* Content Area Style */
.sheet-content {
  -webkit-overflow-scrolling: touch; /* Ensure smooth scrolling on iOS */
}

/* Custom scrollbar for WebKit browsers */
.sheet-content::-webkit-scrollbar {
  width: 8px;
}

.sheet-content::-webkit-scrollbar-track {
  background: transparent;
}

.sheet-content::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.5);
  border-radius: 4px;
}
</style>
