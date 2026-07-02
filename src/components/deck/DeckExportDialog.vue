<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="!smAndUp"
    max-width="500"
    scrollable
    @update:model-value="closeDialog"
  >
    <v-card
      class="d-flex flex-column"
      :class="{ 'rounded-2lg': smAndUp }"
      :style="xs ? 'height: 100vh' : 'height: 80vh'"
    >
      <v-card-title class="d-flex justify-space-between align-center flex-shrink-0">
        <span>汇出卡组</span>
        <v-btn icon="i-mdi:close" variant="text" @click="closeDialog"></v-btn>
      </v-card-title>

      <v-card-text class="pt-0 flex-grow-1 d-flex flex-column themed-scrollbar">
        <div class="d-flex mb-3 flex-shrink-0 align-center">
          <v-btn variant="tonal" class="mw-200 rounded-pill" @click="onGenerateImage" elevation="0">
            <template #prepend>
              <v-icon icon="i-mdi:image-outline" color="blue"></v-icon>
            </template>
            生成图片
          </v-btn>

          <v-btn-toggle
            density="compact"
            v-model="selectedImageMode"
            mandatory
            color="primary"
            variant="outlined"
            class="ml-2 flex-grow-1 rounded-pill"
          >
            <v-btn value="u_climax" class="w-50">
              {{ smAndUp ? 'U CLIMAX' : 'UCX' }}
            </v-btn>
            <v-btn value="tts" class="w-50">TTS</v-btn>
          </v-btn-toggle>

          <v-checkbox-btn
            v-if="selectedImageMode === 'u_climax' && !isLocalDeck"
            v-model="includeQrCode"
            density="compact"
            color="primary"
            class="ml-2 flex-shrink-0"
          >
            <template #label>
              <v-icon icon="i-mdi:qrcode" />
            </template>
          </v-checkbox-btn>
        </div>

        <div v-if="generatedImageResult" class="mb-3 flex-shrink-0">
          <v-img
            :src="generatedImageResult.src"
            class="mb-2 border rounded"
            max-height="300"
            contain
          ></v-img>
          <div class="d-flex gap-2">
            <v-btn
              color="secondary"
              prepend-icon="i-mdi:download"
              variant="tonal"
              class="flex-grow-1 mr-2 rounded-lg"
              @click="handleDownloadResult"
            >
              下载
            </v-btn>
            <v-btn
              color="secondary"
              prepend-icon="i-mdi:content-copy"
              variant="tonal"
              class="flex-grow-1 rounded-lg"
              @click="handleCopyResult"
            >
              复制
            </v-btn>
          </div>
          <v-divider class="mt-3"></v-divider>
        </div>

        <div class="d-flex mb-3 flex-shrink-0">
          <v-btn variant="tonal" class="mw-200 rounded-pill" @click="onDownloadPDF" elevation="0">
            <template #prepend>
              <v-icon icon="i-mdi:file-pdf-box" color="red" />
            </template>
            下载PDF
          </v-btn>

          <v-btn-toggle
            density="compact"
            v-model="selectedLanguage"
            mandatory
            color="primary"
            variant="outlined"
            class="ml-2 flex-grow-1 rounded-pill"
          >
            <v-btn value="jp" class="w-50">日</v-btn>
            <v-btn value="zh" class="w-50">中</v-btn>
          </v-btn-toggle>
        </div>

        <div class="position-relative flex-grow-1 d-flex flex-column">
          <v-textarea
            label="卡组 txt"
            :model-value="deckBaseIds"
            readonly
            rows="10"
            variant="outlined"
            hide-details
            no-resize
            class="themed-scrollbar flex-grow-1"
          ></v-textarea>
          <v-btn
            icon="i-mdi:content-copy"
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
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useSnackbar } from '@/composables/useSnackbar'
import { sortCards } from '@/utils/cardsSort.js'
import { normalizeFileName } from '@/utils/sanitizeFilename'
import { useUIStore } from '@/stores/ui'

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

const emit = defineEmits(['update:modelValue', 'download-image', 'download-pdf', 'generate-image'])
const { triggerSnackbar } = useSnackbar()
const route = useRoute()

const selectedLanguage = ref('jp')
const selectedImageMode = ref('u_climax')
const includeQrCode = ref(false)
const selectedExportFormat = ref('excel')

const deckKey = route.params.key
const isLocalDeck = computed(() => deckKey === 'local')

const uiStore = useUIStore()
const { xs, smAndUp } = useDisplay()

const deckBaseIds = computed(() => {
  const cardList = Object.values(props.cards)
  if (!cardList.length) return ''

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
    const clipboard = await import('clipboard-polyfill')
    await clipboard.writeText(deckBaseIds.value)
    triggerSnackbar('卡组txt已复制', 'success')
  } catch (err) {
    console.error('Failed to copy: ', err)
    triggerSnackbar('复制失败', 'error')
  }
}

const closeDialog = () => {
  emit('update:modelValue', false)
}

const onGenerateImage = () => {
  emit('generate-image', {
    mode: selectedImageMode.value,
    includeQrCode: includeQrCode.value,
  })
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

    const clipboard = await import('clipboard-polyfill')
    const item = new clipboard.ClipboardItem({ 'image/png': imgPromise })
    await clipboard.write([item])
    triggerSnackbar('图片已复制', 'success')
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
