<template>
  <v-dialog :model-value="modelValue" max-width="500" @update:model-value="closeDialog">
    <v-card class="themed-scrollbar">
      <v-card-title class="d-flex justify-space-between align-center">
        <span>汇出卡组</span>
        <v-btn icon="mdi-close" variant="text" @click="closeDialog"></v-btn>
      </v-card-title>
      <v-card-text class="pt-0">
        <div class="d-flex mb-5">
          <v-btn
            color="primary"
            class="mw-200"
            prepend-icon="mdi-image-outline"
            @click="onGenerateImage"
            elevation="0"
          >
            生成图片
          </v-btn>

          <v-btn-toggle
            density="compact"
            v-model="selectedImageMode"
            mandatory
            color="primary"
            variant="outlined"
            class="ml-2 flex-grow-1"
          >
            <v-btn value="u_climax" class="flex-grow-1">U CLIMAX</v-btn>
            <v-btn value="tts" class="flex-grow-1">TTS</v-btn>
          </v-btn-toggle>
        </div>

        <div v-if="generatedImageResult" class="mb-5">
          <v-img
            :src="generatedImageResult.src"
            class="mb-2 border rounded"
            max-height="300"
            contain
          ></v-img>
          <div class="d-flex gap-2">
            <v-btn
              color="secondary"
              prepend-icon="mdi-download"
              variant="tonal"
              class="flex-grow-1 mr-2"
              @click="handleDownloadResult"
            >
              下载
            </v-btn>
            <v-btn
              color="secondary"
              prepend-icon="mdi-content-copy"
              variant="tonal"
              class="flex-grow-1"
              @click="handleCopyResult"
            >
              复制
            </v-btn>
          </div>
        </div>

        <div class="d-flex mb-5">
          <v-btn
            color="primary"
            class="mw-200"
            prepend-icon="mdi-file-pdf-box"
            @click="onDownloadPDF"
            elevation="0"
          >
            下载PDF
          </v-btn>

          <v-btn-toggle
            density="compact"
            v-model="selectedLanguage"
            mandatory
            color="primary"
            variant="outlined"
            class="ml-2 flex-grow-1"
          >
            <v-btn value="jp" class="flex-grow-1">日</v-btn>
            <v-btn value="zh" class="flex-grow-1">中</v-btn>
          </v-btn-toggle>
        </div>
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
import { computed, ref } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { sortCards } from '@/utils/cardsSort.js'
import { normalizeFileName } from '@/utils/sanitizeFilename'
import { useUIStore } from '@/stores/ui'
import * as clipboard from 'clipboard-polyfill'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  cards: {
    type: Object,
    default: () => ({}),
  },
  generatedImageResult: {
    type: Object,
    default: null,
  },
  deckName: {
    type: String,
    default: 'deck',
  },
})

const emit = defineEmits(['update:modelValue', 'download-image', 'download-pdf'])
const { triggerSnackbar } = useSnackbar()

const selectedLanguage = ref('jp')
const selectedImageMode = ref('u_climax')

const uiStore = useUIStore()

const deckBaseIds = computed(() => {
  if (!props.cards) return ''

  const cardList = Object.values(props.cards)
  const sortedCards = sortCards(cardList)

  const allBaseIds = []
  sortedCards.forEach((card) => {
    for (let i = 0; i < card.quantity; i++) {
      allBaseIds.push(card.baseId)
    }
  })

  return allBaseIds.join('\n')
})

const handleDeckTxtList = async () => {
  try {
    await clipboard.writeText(deckBaseIds.value)
    triggerSnackbar('卡组txt已复制到剪贴板', 'success')
  } catch (err) {
    console.error('Failed to copy: ', err)
    triggerSnackbar('复制失败', 'error')
  }
}

const closeDialog = () => {
  emit('update:modelValue', false)
}

const onGenerateImage = () => {
  emit('generate-image', selectedImageMode.value)
}

const handleDownloadResult = async () => {
  if (!props.generatedImageResult) return
  uiStore.setLoading(true)
  try {
    const filename = normalizeFileName(props.deckName)
    const link = document.createElement('a')
    link.href = props.generatedImageResult.src
    console.log(link.href)
    link.download = `${filename || 'image'}.png`
    link.click()
    triggerSnackbar('下载成功', 'success')
  } catch (error) {
    console.error('Download failed', error)
    triggerSnackbar('下载失败', 'error')
  } finally {
    uiStore.setLoading(false)
  }
}

const handleCopyResult = async () => {
  if (!props.generatedImageResult) return
  uiStore.setLoading(true)
  try {
    const imgPromise = fetch(props.generatedImageResult.src).then((response) => {
      if (!response.ok) throw new Error('Network response was not ok')
      return response.blob()
    })

    const item = new ClipboardItem({ 'image/png': imgPromise })
    await clipboard.write([item])
    triggerSnackbar('图片已复制到剪贴板', 'success')
  } catch (error) {
    console.error('Copy failed', error)
    triggerSnackbar('复制失败，请直接复制图片', 'error')
  } finally {
    uiStore.setLoading(false)
  }
}

const onDownloadPDF = () => {
  emit('download-pdf', selectedLanguage.value)
}
</script>
