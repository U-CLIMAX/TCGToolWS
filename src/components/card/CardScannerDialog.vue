<template>
  <!-- 识别方式选择弹窗（桌面端） -->
  <v-dialog
    v-if="smAndUp"
    :model-value="isModePickerOpen"
    @update:model-value="handlePickerModelUpdate"
    max-width="300"
  >
    <v-card class="rounded-2lg pa-2">
      <v-card-title class="text-subtitle-1 font-weight-bold">选择识别方式</v-card-title>
      <v-list nav density="compact">
        <v-list-item
          v-for="option in modeOptions"
          :key="option.value"
          :prepend-icon="option.icon"
          :title="option.title"
          @click="mode = option.value"
        ></v-list-item>
      </v-list>
    </v-card>
  </v-dialog>

  <!-- 识别方式选择抽屉（移动端） -->
  <v-bottom-sheet
    v-else
    :model-value="isModePickerOpen"
    @update:model-value="handlePickerModelUpdate"
  >
    <v-list rounded="t-xl">
      <v-list-subheader>选择识别方式</v-list-subheader>
      <v-list-item v-for="option in modeOptions" :key="option.value" @click="mode = option.value">
        <template #prepend>
          <v-icon :icon="option.icon" />
        </template>
        <v-list-item-title>{{ option.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-bottom-sheet>

  <!-- 扫卡识别主弹窗 -->
  <v-dialog
    :model-value="isScannerDialogOpen"
    @update:model-value="handleClose"
    :fullscreen="!smAndUp"
    max-width="560"
    scrim="rgba(0, 0, 0, 0.65)"
  >
    <v-sheet
      class="scanner-modal-sheet d-flex flex-column overflow-hidden"
      :rounded="smAndUp ? 'xl' : false"
      :height="smAndUp ? 'auto' : '100%'"
    >
      <!-- Header -->
      <div class="d-flex align-center justify-space-between px-4 py-3 scanner-divider">
        <div class="native-chip-group">
          <button
            type="button"
            class="native-chip native-chip--small"
            :class="{ 'native-chip--selected text-primary': mode === 'camera' }"
            @click="switchMode('camera')"
          >
            镜头
          </button>
          <button
            type="button"
            class="native-chip native-chip--small"
            :class="{ 'native-chip--selected text-primary': mode === 'image' }"
            @click="switchMode('image')"
          >
            图片
          </button>
        </div>

        <v-btn icon="i-mdi:close" size="small" variant="text" @click="handleClose(false)" />
      </div>

      <!-- Viewport -->
      <div class="pa-4 d-flex flex-column ga-3 flex-grow-1 justify-center">
        <div
          ref="stageRef"
          class="scanner-stage position-relative overflow-hidden rounded-lg"
          :class="{ 'scanner-stage--camera': mode === 'camera', 'scanner-stage--mobile': !smAndUp }"
        >
          <video
            v-show="mode === 'camera'"
            ref="videoRef"
            playsinline
            muted
            class="scanner-video"
            :class="{ 'scanner-video--ready': isVideoReady }"
            @playing="isVideoReady = true"
            @emptied="isVideoReady = false"
          />
          <canvas v-show="mode === 'camera'" ref="canvasRef" class="scanner-overlay" />

          <!-- Static image dropzone -->
          <div
            v-if="mode === 'image'"
            class="scanner-dropzone d-flex flex-column align-center justify-center text-center pa-6 position-relative"
            :class="{ 'scanner-dropzone--active': isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            @click="fileInputRef?.click()"
          >
            <img v-if="previewUrl" :src="previewUrl" alt="上传预览" class="scanner-preview-img" />
            <template v-else>
              <v-icon icon="i-mdi:image-outline" size="36" class="mb-2 opacity-60" />
              <div class="text-body-2 font-weight-medium">点击选择图片、拖拽或粘贴</div>
              <div v-if="cameraError" class="text-caption text-medium-emphasis mt-1">
                {{ cameraError }}
              </div>
            </template>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="d-none"
              @click.stop
              @change="handleFileChange"
            />
          </div>

          <!-- Minimalist init / camera startup progress -->
          <div
            v-if="!scannerError && (isInitializing || (mode === 'camera' && isStartingCamera))"
            class="scanner-loading d-flex flex-column align-center justify-center px-8"
          >
            <div class="text-caption text-medium-emphasis mb-2">
              <template v-if="isInitializing">正在准备识别引擎 {{ initProgress }}%</template>
              <template v-else>正在启动镜头...</template>
            </div>
            <v-progress-linear
              :indeterminate="!isInitializing"
              :model-value="isInitializing ? initProgress : undefined"
              color="primary"
              height="3"
              rounded
              class="w-75"
            />
          </div>
        </div>

        <!-- Reserve fixed footer space to avoid modal height jitter while scanning/showing candidate chips -->
        <div class="scanner-footer d-flex flex-column justify-center ga-2">
          <div
            v-if="scannerError"
            class="d-flex align-center justify-center flex-wrap ga-2 text-caption text-error text-center"
          >
            <span>{{ scannerError }}</span>
            <v-btn
              v-if="mode === 'camera' && !isInitializing && !isStartingCamera"
              size="x-small"
              variant="text"
              color="primary"
              @click="startCamera(videoRef)"
            >
              重试
            </v-btn>
          </div>

          <div
            v-else-if="mode === 'image' && isScanning && !isInitializing"
            class="text-caption text-medium-emphasis text-center"
          >
            正在识别卡片...
          </div>

          <div
            v-else-if="
              mode === 'image' && hasStaticResult && candidates.length === 0 && !isInitializing
            "
            class="text-caption text-medium-emphasis text-center"
          >
            未识别到匹配卡片，请点击图片重新选择
          </div>

          <div v-else-if="candidates.length > 0 && !lockedCardId" class="d-flex flex-column ga-2">
            <div class="text-caption text-medium-emphasis">选择最接近的卡号</div>
            <div class="d-flex flex-wrap ga-2">
              <button
                v-for="item in candidates"
                :key="item.cardId"
                type="button"
                class="native-chip native-chip--small"
                @click="confirmSelection(item.cardId)"
              >
                <span>{{ item.cardId }}</span>
                <span class="ml-1 opacity-60">{{ Math.round(item.score * 100) }}%</span>
              </button>
            </div>
          </div>

          <div v-else class="text-caption text-medium-emphasis text-center opacity-70">
            {{
              mode === 'camera'
                ? '将卡片置于取景框内，可自动识别或显示候选卡号'
                : '候选卡号将显示在此处'
            }}
          </div>
        </div>
      </div>
    </v-sheet>
  </v-dialog>
</template>

<script setup>
import { computed, ref, toRef, watch, onUnmounted } from 'vue'
import { useDisplay } from 'vuetify'
import { useCardScanner } from '@/composables/useCardScanner'
import { mapCoverCorners } from '@/utils/visionGeometry'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  game: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue', 'select'])

const { smAndUp } = useDisplay()
const gameRef = toRef(props, 'game')

const modeOptions = [
  { value: 'camera', title: '镜头', icon: 'i-mdi:camera-outline' },
  { value: 'image', title: '图片', icon: 'i-mdi:image-outline' },
]

const stageRef = ref(null)
const videoRef = ref(null)
const canvasRef = ref(null)
const fileInputRef = ref(null)
const isDragging = ref(false)
const isVideoReady = ref(false)
const previewUrl = ref(null)

const {
  mode,
  isInitializing,
  isStartingCamera,
  isScanning,
  initProgress,
  cameraError,
  scannerError,
  overlayCorners,
  overlayFrameSize,
  overlayLocked,
  candidates,
  lockedCardId,
  hasStaticResult,
  startCamera,
  stopCamera,
  scanImageBlob,
  resetResult,
} = useCardScanner(gameRef)

const isModePickerOpen = computed(() => props.modelValue && !mode.value)
const isScannerDialogOpen = computed(() => props.modelValue && Boolean(mode.value))

const clearPreview = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
}

const resetOverlayCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = 0
  canvas.height = 0
}

const releaseCameraView = () => {
  stopCamera()
  resetOverlayCanvas()
}

const drawOverlay = (corners, locked) => {
  const canvas = canvasRef.value
  const video = videoRef.value
  if (mode.value !== 'camera' || !canvas || !video) return

  const cssW = video.clientWidth || stageRef.value?.clientWidth || 0
  const cssH = video.clientHeight || stageRef.value?.clientHeight || 0
  if (!cssW || !cssH) return

  if (!corners || corners.length < 8) {
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    return
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const targetW = Math.round(cssW * dpr)
  const targetH = Math.round(cssH * dpr)
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }

  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)

  const srcW = overlayFrameSize.value.width || video.videoWidth
  const srcH = overlayFrameSize.value.height || video.videoHeight

  ctx.strokeStyle = locked ? '#22c55e' : 'rgba(34, 197, 94, 0.9)'
  ctx.lineWidth = locked ? 2.5 : 2
  const projected = mapCoverCorners(corners, srcW, srcH, cssW, cssH)
  ctx.beginPath()
  ctx.moveTo(projected[0], projected[1])
  for (let i = 1; i < 4; i++) {
    ctx.lineTo(projected[i * 2], projected[i * 2 + 1])
  }
  ctx.closePath()
  ctx.stroke()
}

let stageResizeObserver = null

const confirmSelection = (cardId) => {
  emit('select', { cardId, candidates: candidates.value })
  handleClose(false)
}

const handlePickerModelUpdate = (val) => {
  if (!val && !mode.value) {
    emit('update:modelValue', false)
  }
}

const handleClose = (val) => {
  if (!val) releaseCameraView()
  emit('update:modelValue', val)
}

const switchMode = (nextMode) => {
  if (mode.value === nextMode) return
  mode.value = nextMode
  clearPreview()
  resetResult()
  if (nextMode !== 'camera') {
    releaseCameraView()
  }
}

const runStaticScan = async (blob) => {
  clearPreview()
  previewUrl.value = URL.createObjectURL(blob)
  await scanImageBlob(blob)
}

const handleFileChange = async (e) => {
  const file = e.target.files?.[0]
  try {
    if (file) await runStaticScan(file)
  } finally {
    e.target.value = ''
  }
}

const isImageFile = (file) =>
  Boolean(
    file && (file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name))
  )

const handleDrop = async (e) => {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (isImageFile(file)) {
    await runStaticScan(file)
  } else if (e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain')) {
    scannerError.value = '浏览器限制直接拖拽网页或本地链接，请点击选择文件或 Ctrl+V 粘贴'
  }
}

const handlePaste = async (e) => {
  if (!isScannerDialogOpen.value) return
  const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'))
  const fileFromFiles = Array.from(e.clipboardData?.files || []).find((f) => isImageFile(f))
  const blob = item?.getAsFile() || fileFromFiles
  if (blob) {
    mode.value = 'image'
    releaseCameraView()
    await runStaticScan(blob)
  }
}

// 监听扫描主弹窗开关：开启时重置识别与预览状态并绑定剪贴簿监听；关闭时释放硬件与预览资源
watch(isScannerDialogOpen, (open) => {
  isVideoReady.value = false
  if (open) {
    clearPreview()
    resetResult()
    cameraError.value = null
    window.addEventListener('paste', handlePaste)
  } else {
    window.removeEventListener('paste', handlePaste)
    releaseCameraView()
    clearPreview()
    resetResult()
  }
})

// 监听扫描主弹窗开启状态、识别模式与 <video> 挂载状态：确保弹窗过渡挂载完成后可靠启动摄像头，避免快速开关丢失 DOM 引用
watch(
  [isScannerDialogOpen, mode, videoRef],
  ([open, currentMode, videoEl]) => {
    if (open && currentMode === 'camera' && videoEl) {
      startCamera(videoEl)
    }
  },
  { flush: 'post' }
)

// 监听识别四角坐标与锁定状态，同步重绘极简几何轮廓线
watch([overlayCorners, overlayLocked], ([corners, locked]) => {
  drawOverlay(corners, locked)
})

// 监听高信心自动锁定卡号：触发选择事件并关闭弹窗
watch(lockedCardId, (cardId) => {
  if (cardId) confirmSelection(cardId)
})

// 监听舞台容器挂载与尺寸变化：在窗口缩放或手机横竖屏切换时保持识别框画布对齐
watch(
  stageRef,
  (el) => {
    stageResizeObserver?.disconnect()
    stageResizeObserver = null
    if (!el || typeof ResizeObserver === 'undefined') return
    stageResizeObserver = new ResizeObserver(() => {
      drawOverlay(overlayCorners.value, overlayLocked.value)
    })
    stageResizeObserver.observe(el)
  },
  { flush: 'post' }
)

onUnmounted(() => {
  stageResizeObserver?.disconnect()
  window.removeEventListener('paste', handlePaste)
  clearPreview()
  releaseCameraView()
})
</script>

<style scoped>
.scanner-modal-sheet {
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
}

.scanner-divider {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.scanner-stage {
  aspect-ratio: 4 / 3;
  width: 100%;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.scanner-stage--camera {
  background-color: #0d1015;
}

.scanner-stage--mobile {
  aspect-ratio: 3 / 4;
  max-height: 60vh;
}

.scanner-video,
.scanner-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.scanner-video {
  object-fit: cover;
  opacity: 0;
}

.scanner-video--ready {
  opacity: 1;
}

.scanner-overlay {
  pointer-events: none;
}

.scanner-dropzone {
  height: 100%;
  cursor: pointer;
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  color: rgb(var(--v-theme-on-surface));
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.scanner-preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.scanner-dropzone--active {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.06);
}

.scanner-loading {
  position: absolute;
  inset: 0;
  background: rgba(var(--v-theme-surface), 0.94);
  color: rgb(var(--v-theme-on-surface));
}

.scanner-footer {
  min-height: 58px;
}
</style>
