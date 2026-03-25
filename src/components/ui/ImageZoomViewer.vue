<template>
  <!-- 放大對話框 -->
  <v-dialog
    v-model="internalDialog"
    :fullscreen="!smAndUp"
    max-width="90vw"
    @click:outside="closeDialog"
  >
    <!-- Mobile Layout -->
    <v-card v-if="!smAndUp" color="black" elevation="0" class="mobile-viewer">
      <div
        ref="containerRef"
        class="mobile-viewer__image-container"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        :style="{ touchAction: canRunCustomZoom ? 'none' : 'auto' }"
      >
        <v-img
          :src="images[currentImageIndex]"
          contain
          class="mobile-viewer__image"
          :style="imageTransformStyle"
        ></v-img>
      </div>
      <div class="mobile-viewer__controls">
        <v-btn v-if="images.length > 1" icon variant="text" @click.stop="prevImage">
          <v-icon size="large">mdi-chevron-left</v-icon>
        </v-btn>
        <v-spacer v-if="images.length > 1"></v-spacer>
        <div v-if="images.length > 1" class="mobile-viewer__indicator">
          {{ currentImageIndex + 1 }} / {{ images.length }}
        </div>
        <v-spacer v-if="images.length > 1"></v-spacer>
        <v-btn v-if="images.length > 1" icon variant="text" @click.stop="nextImage">
          <v-icon size="large">mdi-chevron-right</v-icon>
        </v-btn>

        <!-- 佔位，確保關閉按鈕在最右邊 -->
        <v-spacer v-if="images.length <= 1"></v-spacer>
        <v-btn icon variant="text" @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
    </v-card>

    <!-- Desktop Layout -->
    <v-card v-else color="transparent" elevation="0">
      <!-- 關閉按鈕 -->
      <v-btn icon class="dialog-close-btn" @click="closeDialog">
        <v-icon>mdi-close</v-icon>
      </v-btn>

      <!-- 左右切換按鈕 (如果有多張圖片) -->
      <template v-if="images.length > 1">
        <v-btn icon class="dialog-nav-btn dialog-nav-prev" @click.stop="prevImage">
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
        <v-btn icon class="dialog-nav-btn dialog-nav-next" @click.stop="nextImage">
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
      </template>

      <!-- 放大圖片 -->
      <v-img :src="images[currentImageIndex]" contain class="dialog-image"></v-img>

      <!-- 圖片指示器 -->
      <div v-if="images.length > 1" class="dialog-indicator">
        {{ currentImageIndex + 1 }} / {{ images.length }}
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useDisplay } from 'vuetify'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  images: {
    type: Array,
    required: true,
    default: () => [],
  },
  initialIndex: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['update:modelValue', 'dialog-opened', 'dialog-closed'])

const { smAndUp } = useDisplay()

const internalDialog = ref(false)
const currentImageIndex = ref(0)
const containerRef = ref(null)

// 判斷是否處於手機全螢幕佈局
const isMobileFullscreen = computed(() => !smAndUp.value)

// 判斷是否應啟用自定義縮放邏輯
// 必須在手機全螢幕佈局下，且「瀏覽器層級」沒有被明顯放大 (VisualViewport scale 接近 1)
const canRunCustomZoom = computed(() => {
  if (!isMobileFullscreen.value) return false

  // 如果 VisualViewport scale > 1.01，將控制權交還給瀏覽器。
  if (window.visualViewport && window.visualViewport.scale > 1.01) {
    return false
  }

  return true
})

// 縮放與平移狀態
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const lastScale = ref(1)
const lastTranslateX = ref(0)
const lastTranslateY = ref(0)
const startDistance = ref(0)
const startTouchX = ref(0)
const startTouchY = ref(0)
const startMidX = ref(0)
const startMidY = ref(0)
const isPinching = ref(false)
const isDragging = ref(false)

const imageTransformStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transition: isPinching.value || isDragging.value ? 'none' : 'transform 0.2s ease-out',
}))

// 限制位移邊界
const limitTransform = (x, y, s) => {
  if (!containerRef.value || !canRunCustomZoom.value) return { x, y }
  const { width, height } = containerRef.value.getBoundingClientRect()

  const maxX = Math.max(0, (width * s - width) / 2)
  const maxY = Math.max(0, (height * s - height) / 4)

  return {
    x: Math.min(Math.max(-maxX, x), maxX),
    y: Math.min(Math.max(-maxY, y), maxY),
  }
}

// 重置縮放
const resetZoom = () => {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
  lastScale.value = 1
  lastTranslateX.value = 0
  lastTranslateY.value = 0
}

// 同步 v-model
watch(
  () => props.modelValue,
  (newVal) => {
    internalDialog.value = newVal
    if (newVal) {
      currentImageIndex.value = props.initialIndex
      resetZoom()
      emit('dialog-opened')
    }
  }
)

watch(internalDialog, (newVal) => {
  emit('update:modelValue', newVal)
  if (!newVal) {
    resetZoom()
    emit('dialog-closed')
  }
})

// 當切換圖片時重置縮放
watch(currentImageIndex, resetZoom)

// 關閉對話框
const closeDialog = () => {
  internalDialog.value = false
}

// 觸摸事件處理
const getDistance = (touches) => {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  )
}

const getMidpoint = (touches) => {
  if (!containerRef.value) return { x: 0, y: 0 }
  const rect = containerRef.value.getBoundingClientRect()
  const cx = (touches[0].clientX + touches[1].clientX) / 2
  const cy = (touches[0].clientY + touches[1].clientY) / 2
  // 返回相對於容器中心的座標
  return {
    x: cx - (rect.left + rect.width / 2),
    y: cy - (rect.top + rect.height / 2),
  }
}

const handleTouchStart = (e) => {
  if (!canRunCustomZoom.value) return

  if (e.touches.length === 2) {
    isPinching.value = true
    isDragging.value = false
    startDistance.value = getDistance(e.touches)
    const mid = getMidpoint(e.touches)
    startMidX.value = mid.x
    startMidY.value = mid.y
    lastScale.value = scale.value
    lastTranslateX.value = translateX.value
    lastTranslateY.value = translateY.value
  } else if (e.touches.length === 1) {
    isDragging.value = true
    startTouchX.value = e.touches[0].clientX - translateX.value
    startTouchY.value = e.touches[0].clientY - translateY.value
  }
}

const handleTouchMove = (e) => {
  if (!canRunCustomZoom.value) return

  if (isPinching.value && e.touches.length === 2) {
    const currentDistance = getDistance(e.touches)
    const newScale = Math.min(
      Math.max(1, (currentDistance / startDistance.value) * lastScale.value),
      5
    )

    // 計算縮放中心位移（兩根手指的中點）
    // 公式: tx_new = mid_x - (mid_x - tx_old) * (s_new / s_old)
    const mid = getMidpoint(e.touches)
    const newTranslateX =
      mid.x - (startMidX.value - lastTranslateX.value) * (newScale / lastScale.value)
    const newTranslateY =
      mid.y - (startMidY.value - lastTranslateY.value) * (newScale / lastScale.value)

    const limited = limitTransform(newTranslateX, newTranslateY, newScale)
    scale.value = newScale
    translateX.value = limited.x
    translateY.value = limited.y
  } else if (isDragging.value && e.touches.length === 1 && scale.value > 1) {
    const newX = e.touches[0].clientX - startTouchX.value
    const newY = e.touches[0].clientY - startTouchY.value
    const limited = limitTransform(newX, newY, scale.value)
    translateX.value = limited.x
    translateY.value = limited.y
  }
}

const handleTouchEnd = () => {
  if (!canRunCustomZoom.value) return

  isPinching.value = false
  isDragging.value = false
  if (scale.value < 1.05) {
    resetZoom()
  }
}

// 上一張圖片
const prevImage = () => {
  currentImageIndex.value =
    (currentImageIndex.value - 1 + props.images.length) % props.images.length
}

// 下一張圖片
const nextImage = () => {
  currentImageIndex.value = (currentImageIndex.value + 1) % props.images.length
}

// 鍵盤事件支持
const handleKeydown = (e) => {
  if (!internalDialog.value) return

  switch (e.key) {
    case 'ArrowLeft':
      prevImage()
      break
    case 'ArrowRight':
      nextImage()
      break
    case 'Escape':
      closeDialog()
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* Desktop styles */
.dialog-close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 2;
  background-color: rgba(18, 18, 18, 0.6) !important;
  color: rgb(255, 255, 255) !important;
}

.dialog-close-btn:hover {
  background-color: rgba(18, 18, 18, 0.8) !important;
}

.dialog-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  background-color: rgba(18, 18, 18, 0.6) !important;
  color: rgb(255, 255, 255) !important;
}

.dialog-nav-btn:hover {
  background-color: rgba(18, 18, 18, 0.8) !important;
}

.dialog-nav-prev {
  left: 1rem;
}

.dialog-nav-next {
  right: 1rem;
}

.dialog-image {
  aspect-ratio: 16 / 9;
  max-height: 90vh;
  border-radius: 8px;
}

.dialog-indicator {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(18, 18, 18, 0.6);
  color: rgb(255, 255, 255);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

/* Mobile Layout Styles */
.mobile-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  border-radius: 0;
}

.mobile-viewer__image-container {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  overflow: hidden;
}

.mobile-viewer__image {
  width: 100%;
  height: auto;
  max-height: 100%;
}

.mobile-viewer__controls {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background-color: #1e1e1e;
  flex-shrink: 0;
}

.mobile-viewer__indicator {
  color: white;
  font-size: 1rem;
  font-weight: 500;
  text-align: center;
}
</style>
