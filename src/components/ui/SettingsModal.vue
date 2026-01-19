<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="xs"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500px"
  >
    <v-card class="h-100 themed-scrollbar" :class="{ 'is-dragging': isDraggingSlider }">
      <v-card-title class="d-flex align-center">
        <span class="headline">设定</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)"></v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-0">
        <v-list>
          <v-list-item>
            <v-list-item-title>暗黑模式</v-list-item-title>
            <template #append>
              <v-switch
                v-model="uiStore.theme"
                color="primary"
                true-value="dark"
                false-value="light"
                hide-details
              />
            </template>
          </v-list-item>

          <v-divider />

          <v-list-item>
            <v-list-item-title class="d-flex align-center">
              性能模式启动门槛
              <v-tooltip
                text="越低的门槛越容易进入性能模式，简化动画以保证流畅运行"
                location="top"
                open-on-click
              >
                <template #activator="{ props: tooltipProps }">
                  <v-icon
                    v-bind="tooltipProps"
                    icon="mdi-help-circle-outline"
                    size="x-small"
                    class="ml-1"
                  ></v-icon>
                </template>
              </v-tooltip>
            </v-list-item-title>
          </v-list-item>
          <div class="px-4 pb-2">
            <v-btn-toggle
              v-model="uiStore.performanceThreshold"
              color="primary"
              group
              mandatory
              variant="text"
              class="w-100"
            >
              <v-btn :value="0" class="flex-grow-1" style="min-width: 0px">
                <span v-if="!xs" class="text-caption">永久开启</span>
                <span v-else class="text-caption">无</span>
                <v-icon v-if="!xs" end icon="mdi-lightning-bolt"></v-icon>
              </v-btn>
              <v-btn :value="300" class="flex-grow-1" style="min-width: 0px">
                <span class="text-caption">低</span>
                <v-icon v-if="!xs" end icon="mdi-speedometer-slow"></v-icon>
              </v-btn>
              <v-btn :value="600" class="flex-grow-1" style="min-width: 0px">
                <span class="text-caption">中</span>
                <v-icon v-if="!xs" end icon="mdi-speedometer-medium"></v-icon>
              </v-btn>
              <v-btn :value="1000" class="flex-grow-1" style="min-width: 0px">
                <span class="text-caption">高</span>
                <v-icon v-if="!xs" end icon="mdi-speedometer"></v-icon>
              </v-btn>
            </v-btn-toggle>
          </div>

          <v-divider />

          <v-list-item>
            <v-list-item-title class="mt-4 pb-1">背景图片</v-list-item-title>
            <v-img
              v-if="uiStore.backgroundImage"
              :src="uiStore.backgroundImage.src"
              :aspect-ratio="previewAspectRatio"
              class="my-4 rounded-lg"
              max-height="200"
            >
              <template #placeholder>
                <div class="d-flex align-center justify-center fill-height">
                  <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
                </div>
              </template>
            </v-img>

            <input ref="fileInputRef" type="file" accept="image/*" hidden @change="onFileChange" />

            <div class="d-flex ga-2 mt-2">
              <v-btn
                @click="handleUploadClick"
                prepend-icon="mdi-image"
                variant="tonal"
                class="flex-grow-1"
              >
                {{ uiStore.backgroundImage ? '更换图片' : '上传图片' }}
              </v-btn>
              <v-btn
                v-if="uiStore.backgroundImage"
                @click="clearBackground"
                color="error"
                variant="tonal"
                class="flex-grow-0"
              >
                <v-icon icon="mdi-trash-can"></v-icon>
              </v-btn>
            </div>
          </v-list-item>

          <template v-if="uiStore.backgroundImage">
            <v-divider class="mt-2" />
            <div class="px-4 mt-4">
              <div class="text-subtitle-1 mb-2">背景设定</div>
              <v-slider
                :model-value="uiStore.backgroundImage.maskOpacity"
                @update:model-value="uiStore.updateBackgroundImage({ maskOpacity: $event })"
                @start="isDraggingSlider = true"
                @end="isDraggingSlider = false"
                label="遮罩浓度"
                min="0"
                max="1"
                step="0.05"
                thumb-label
                prepend-icon="mdi-opacity"
              ></v-slider>
              <v-slider
                :model-value="uiStore.backgroundImage.blur"
                @update:model-value="uiStore.updateBackgroundImage({ blur: $event })"
                @start="isDraggingSlider = true"
                @end="isDraggingSlider = false"
                label="模糊半径"
                min="0"
                max="20"
                step="1"
                thumb-label
                prepend-icon="mdi-blur"
              ></v-slider>
              <v-select
                :model-value="uiStore.backgroundImage.size"
                @update:model-value="uiStore.updateBackgroundImage({ size: $event })"
                label="填满样式"
                :items="[
                  { title: '等比例填满', value: 'cover' },
                  { title: '非等比例填满', value: '100% 100%' },
                  { title: '等比例缩放', value: 'contain' },
                  { title: '保持原比例', value: 'auto' },
                ]"
                prepend-icon="mdi-fit-to-page-outline"
                hide-details
                variant="solo-filled"
              ></v-select>

              <v-list-item class="px-0">
                <v-list-item-title>图表自适应色彩</v-list-item-title>
                <template #append>
                  <v-switch v-model="uiStore.useAdaptiveColor" color="primary" hide-details />
                </template>
              </v-list-item>
            </div>
          </template>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>

  <ImageCropperModal
    v-show="isCropperOpen"
    v-model="isCropperOpen"
    :src="imageToCrop"
    @confirm="onCropConfirm"
  />
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useDisplay } from 'vuetify'
import ImageCropperModal from './ImageCropperModal.vue'

const { xs } = useDisplay()

const uiStore = useUIStore()
const fileInputRef = ref(null)
const isCropperOpen = ref(false)
const imageToCrop = ref(null)
const isDraggingSlider = ref(false)

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const dialog = ref(props.modelValue)

const previewAspectRatio = computed(() => {
  if (uiStore.backgroundImage) {
    const { width, height } = uiStore.backgroundImage
    return width && height ? width / height : 16 / 9
  }
  return 16 / 9
})

watch(
  () => props.modelValue,
  (newValue) => {
    dialog.value = newValue
  }
)

watch(dialog, (newValue) => {
  if (!newValue) {
    emit('update:modelValue', false)
  }
})

const onFileChange = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    imageToCrop.value = e.target.result
    isCropperOpen.value = true
  }
  reader.readAsDataURL(file)

  // Reset file input to allow re-uploading the same file
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const onCropConfirm = (result) => {
  uiStore.setBackgroundImage(result)
  isCropperOpen.value = false
  imageToCrop.value = null
}

const clearBackground = () => {
  uiStore.clearBackgroundImage()
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const handleUploadClick = () => {
  fileInputRef.value?.click()
}
</script>

<style scoped>
.v-card.is-dragging {
  opacity: 0.5;
  transition: opacity 0.2s ease-in-out;
}
</style>
