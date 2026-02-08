<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="smAndDown"
    @update:model-value="closeDialog"
    scrollable
    max-width="500"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <span>下载效果文本</span>
      </v-card-title>
      <v-divider />
      <v-card-text class="pb-0 h-100 themed-scrollbar">
        <v-row dense>
          <v-col cols="12" sm="3">
            <v-text-field
              v-model.number="localWidth"
              label="寬度"
              type="number"
              suffix="px"
              class="hide-number-input-arrows"
              hide-spin-buttons
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-text-field
              v-model.number="localBorderRadius"
              label="边角圆弧"
              type="number"
              suffix="px"
              class="hide-number-input-arrows"
              hide-spin-buttons
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-text-field
              v-model.number="localFontSize"
              label="字体大小"
              type="number"
              suffix="px"
              class="hide-number-input-arrows"
              hide-spin-buttons
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-text-field
              v-model.number="localLineHeight"
              label="行间距"
              type="number"
              suffix="px"
              class="hide-number-input-arrows"
              hide-spin-buttons
              variant="outlined"
            />
          </v-col>
        </v-row>

        <div class="text-subtitle-2 mb-2">背景颜色</div>
        <v-color-picker
          v-model="localBgColor"
          swatches-max-height="100"
          width="100%"
          elevation="0"
          flat
          class="mb-4"
        />

        <div class="text-subtitle-2 mb-2">文字颜色</div>
        <v-color-picker
          v-model="localTextColor"
          swatches-max-height="100"
          width="100%"
          elevation="0"
          flat
        />
      </v-card-text>

      <v-card-actions class="mx-6">
        <v-spacer />
        <v-btn text="取消" variant="text" @click="closeDialog" />
        <v-btn text="确定" variant="tonal" color="primary" @click="confirmDownload" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useDownloadStore } from '@/stores/download'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const downloadStore = useDownloadStore()
const { smAndDown } = useDisplay()

const localWidth = ref(800)
const localBgColor = ref('#FFFFFF')
const localTextColor = ref('#000000')
const localBorderRadius = ref(16)
const localFontSize = ref(20)
const localLineHeight = ref(28)

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      // Sync from store to local state when dialog opens
      localWidth.value = downloadStore.textWidth
      localBgColor.value = downloadStore.textBgColor
      localTextColor.value = downloadStore.textColor
      localBorderRadius.value = downloadStore.textBorderRadius
      localFontSize.value = downloadStore.textFontSize
      localLineHeight.value = downloadStore.textLineHeight
    }
  }
)

const confirmDownload = () => {
  // Commit local state to store
  downloadStore.textWidth = localWidth.value
  downloadStore.textBgColor = localBgColor.value
  downloadStore.textColor = localTextColor.value
  downloadStore.textBorderRadius = localBorderRadius.value
  downloadStore.textFontSize = localFontSize.value
  downloadStore.textLineHeight = localLineHeight.value
  emit('confirm')
}

const closeDialog = () => {
  emit('update:modelValue', false)
}
</script>
