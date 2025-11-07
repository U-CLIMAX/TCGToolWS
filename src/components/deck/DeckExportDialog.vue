<template>
  <v-dialog :model-value="modelValue" max-width="500" @update:model-value="closeDialog">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>汇出卡组</span>
        <v-btn icon="mdi-close" variant="text" @click="closeDialog"></v-btn>
      </v-card-title>
      <v-card-text class="pt-0">
        <v-btn
          block
          color="primary"
          prepend-icon="mdi-download"
          class="mb-5"
          @click="onDownloadImage"
        >
          下载图片
        </v-btn>
        <v-btn
          block
          color="primary"
          prepend-icon="mdi-file-pdf-box"
          class="mb-5"
          @click="onDownloadPDF"
        >
          下载PDF
        </v-btn>
        <div class="position-relative">
          <v-textarea
            label="卡组 txt"
            :model-value="deckBaseIds"
            readonly
            rows="10"
            variant="outlined"
            hide-details
            no-resize
            class="themed-scrollbar"
          ></v-textarea>
          <v-btn
            icon="mdi-content-copy"
            size="small"
            variant="text"
            class="position-absolute"
            style="top: 8px; right: 8px"
            @click="handleDeckTxtList"
          ></v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  cards: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue', 'download-image'])
const { triggerSnackbar } = useSnackbar()

const deckBaseIds = computed(() => {
  if (!props.cards) return ''
  const allBaseIds = []
  Object.values(props.cards).forEach((card) => {
    for (let i = 0; i < card.quantity; i++) {
      allBaseIds.push(card.baseId)
    }
  })
  return allBaseIds.join('\n')
})

const handleDeckTxtList = async () => {
  try {
    await navigator.clipboard.writeText(deckBaseIds.value)
    triggerSnackbar('卡组txt已复制到剪贴板', 'success')
  } catch (err) {
    console.error('Failed to copy: ', err)
    triggerSnackbar('复制失败', 'error')
  }
}

const closeDialog = () => {
  emit('update:modelValue', false)
}

const onDownloadImage = () => {
  emit('download-image')
  closeDialog()
}

const onDownloadPDF = () => {
  emit('download-pdf')
  closeDialog()
}
</script>
