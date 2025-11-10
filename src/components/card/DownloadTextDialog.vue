<template>
  <v-dialog :model-value="modelValue" @update:model-value="closeDialog" max-width="500">
    <v-card title="下载效果文本设定">
      <v-card-text class="pb-0">
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
        <v-color-picker
          v-model="localBgColor"
          label="背景颜色"
          swatches-max-height="100"
          width="100%"
          elevation="0"
          flat
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text="确认" color="primary" @click="confirmDownload" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDownloadStore } from '@/stores/download'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const downloadStore = useDownloadStore()

const localWidth = ref(800)
const localBgColor = ref('#FFFFFF')
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
  downloadStore.textBorderRadius = localBorderRadius.value
  downloadStore.textFontSize = localFontSize.value
  downloadStore.textLineHeight = localLineHeight.value
  emit('confirm')
}

const closeDialog = () => {
  emit('update:modelValue', false)
}
</script>
