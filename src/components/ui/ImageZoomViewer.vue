<template>
  <!-- 放大對話框 -->
  <v-dialog v-model="internalDialog" max-width="90vw" @click:outside="closeDialog">
    <v-card color="transparent" elevation="0">
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
import { ref, watch, onMounted, onUnmounted } from 'vue'

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

const internalDialog = ref(false)
const currentImageIndex = ref(0)

// 同步 v-model
watch(
  () => props.modelValue,
  (newVal) => {
    internalDialog.value = newVal
    if (newVal) {
      currentImageIndex.value = props.initialIndex
      emit('dialog-opened')
    }
  }
)

watch(internalDialog, (newVal) => {
  emit('update:modelValue', newVal)
  if (!newVal) {
    emit('dialog-closed')
  }
})

// 關閉對話框
const closeDialog = () => {
  internalDialog.value = false
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
/* Dialog styles */
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

/* Responsive adjustments */
@media (max-width: 599.98px) {
  .dialog-nav-btn {
    width: 40px;
    height: 40px;
  }

  .dialog-nav-prev {
    left: 0.5rem;
  }

  .dialog-nav-next {
    right: 0.5rem;
  }

  .dialog-close-btn {
    top: 0.5rem;
    right: 0.5rem;
  }

  .dialog-indicator {
    bottom: 0.5rem;
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }
}
</style>
