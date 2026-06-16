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

        <div class="d-flex mb-4 flex-shrink-0">
          <v-tooltip :text="excelTooltip" :disabled="canExportExcel" location="bottom">
            <template #activator="{ props: tooltipProps }">
              <div v-bind="tooltipProps" class="flex-grow-1 d-flex">
                <v-btn
                  variant="tonal"
                  class="mw-200 rounded-pill"
                  @click="onDownloadCardList"
                  :disabled="!canExportExcel"
                  elevation="0"
                >
                  <template #prepend>
                    <v-icon icon="i-mdi:table" color="green" />
                  </template>
                  下载卡表
                </v-btn>

                <v-btn-toggle
                  density="compact"
                  v-model="selectedExportFormat"
                  mandatory
                  color="primary"
                  variant="outlined"
                  class="ml-2 flex-grow-1 rounded-pill"
                  :disabled="!canExportExcel"
                >
                  <v-btn value="excel" class="w-50">EXCEL</v-btn>
                  <v-btn value="pdf" class="w-50">PDF</v-btn>
                </v-btn-toggle>
              </div>
            </template>
          </v-tooltip>
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
import { Workbook, excelToPdf } from '@cj-tech-master/excelts'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import localforage from 'localforage'

import templateUrl from '@/assets/form/ws_cn.xlsx?url'
import fontUrl from '@/assets/styles/fonts/NotoSansSC-Light.ttf?url'
import { useSnackbar } from '@/composables/useSnackbar'
import { sortCards } from '@/utils/cardsSort.js'
import { normalizeFileName } from '@/utils/sanitizeFilename'
import collator from '@/utils/collator'
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

const totalCardCount = computed(() =>
  Object.values(props.cards).reduce((sum, c) => sum + (c.quantity || 0), 0)
)

const climaxCardCount = computed(() =>
  Object.values(props.cards)
    .filter((c) => c.type === '高潮卡')
    .reduce((sum, c) => sum + (c.quantity || 0), 0)
)

const canExportExcel = computed(() => totalCardCount.value === 50 && climaxCardCount.value === 8)

const excelTooltip = computed(() => {
  if (totalCardCount.value !== 50) return `卡组须恰好50张（当前${totalCardCount.value}张）`
  if (climaxCardCount.value !== 8) return `高潮卡须恰好8张（当前${climaxCardCount.value}张）`
  return ''
})

const handleDeckTxtList = async () => {
  try {
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

    const item = new ClipboardItem({ 'image/png': imgPromise })
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

const generateWorkbook = async () => {
  const response = await fetch(templateUrl)
  const arrayBuffer = await response.arrayBuffer()

  const wb = new Workbook()
  await wb.xlsx.load(arrayBuffer)
  const ws = wb.worksheets[0]

  // 分离普通卡和高潮卡，各自按卡名排序
  const sortByName = (a, b) => collator.compare(a.name || '', b.name || '')
  const normalCards = Object.values(props.cards)
    .filter((c) => c.type !== '高潮卡')
    .sort(sortByName)
  const climaxCards = Object.values(props.cards)
    .filter((c) => c.type === '高潮卡')
    .sort(sortByName)

  // 按 quantity 展开成行
  const expandCards = (cardList) => {
    const rows = []
    for (const card of cardList) {
      for (let i = 0; i < card.quantity; i++) {
        rows.push({ id: card.id, rarity: card.rarity || '', name: card.name || '' })
      }
    }
    return rows
  }

  // 应用「〃」省略规则（与前一行比较）
  const applyDitto = (rows) => {
    const result = []
    let prevId = null
    let prevName = null
    for (const row of rows) {
      const cleanId =
        typeof row.id === 'string' && row.id.endsWith('_') ? row.id.slice(0, -1) : row.id
      let displayId = cleanId
      let displayName = row.name
      if (cleanId === prevId) {
        displayId = '〃'
        displayName = '〃'
      } else if (row.name === prevName) {
        displayName = '〃'
      }
      result.push({ id: displayId, rarity: row.rarity, name: displayName })
      prevId = cleanId
      prevName = row.name
    }
    return result
  }

  const processedNormal = applyDitto(expandCards(normalCards))
  const processedClimax = applyDitto(expandCards(climaxCards))

  // 写入单元格辅助函数（使用 1-indexed 行列）
  const setCell = (row, col, value) => {
    const cell = ws.getCell(row, col)
    cell.value = value
    cell.font = { ...cell.font, size: 9 }
    cell.alignment = { ...cell.alignment, wrapText: true, vertical: 'middle' }
  }

  // 普通卡写入：
  //   槽 0-24  → B(2)C(3)D(4)，row 14-38
  //   槽 25-41 → F(6)G(7)H(8)，row 14-30
  processedNormal.forEach((row, idx) => {
    let r, cId, cRarity, cName
    if (idx < 25) {
      r = 14 + idx
      cId = 2
      cRarity = 3
      cName = 4
    } else {
      r = 14 + (idx - 25)
      cId = 6
      cRarity = 7
      cName = 8
    }
    setCell(r, cId, row.id)
    setCell(r, cRarity, row.rarity)
    setCell(r, cName, row.name)
  })

  // 高潮卡写入：F31:H38（row 31-38，col 6,7,9）
  processedClimax.forEach((row, idx) => {
    const r = 31 + idx
    setCell(r, 6, row.id)
    setCell(r, 7, row.rarity)
    setCell(r, 9, row.name)
  })

  // 僅對 A42 包含同意書條款的格子進行換列折行處理
  const cellA42 = ws.getCell(42, 1)
  if (cellA42 && typeof cellA42.value === 'string') {
    cellA42.value = cellA42.value.replace('在BUSHIROAD', '在\nBUSHIROAD')
    cellA42.alignment = { ...cellA42.alignment, wrapText: true }
  }

  return wb
}

const exportExcel = async () => {
  try {
    const wb = await generateWorkbook()
    const filename = normalizeFileName(props.deckName) || 'deck'
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}_卡组登记表.xlsx`
    link.click()
    URL.revokeObjectURL(url)
    triggerSnackbar('Excel 卡表已匯出', 'success')
  } catch (error) {
    console.error('Export Excel failed', error)
    triggerSnackbar('Excel 匯出失敗', 'error')
  }
}

const FONT_KEY = 'pdf_font'

const getPdfFont = async () => {
  try {
    const cached = await localforage.getItem(FONT_KEY)
    if (cached instanceof Uint8Array) {
      return cached
    }
  } catch (e) {
    console.warn('Failed to read font cache:', e)
  }

  const response = await fetch(fontUrl)
  if (!response.ok) throw new Error('Failed to load PDF font')
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  try {
    await localforage.setItem(FONT_KEY, bytes)
  } catch (e) {
    console.warn('Failed to write font cache:', e)
  }
  return bytes
}

const exportPDF = async () => {
  try {
    const wb = await generateWorkbook()

    let fontBytes = null
    try {
      // Check cache first or download from local assets
      const cached = await localforage.getItem(FONT_KEY)
      if (cached instanceof Uint8Array) {
        fontBytes = cached
      } else {
        triggerSnackbar('正在載入字型，首次匯出約需 5~10 秒，請稍候...', 'info')
        fontBytes = await getPdfFont()
      }
    } catch (fontErr) {
      console.error('Failed to get CJK font from local assets:', fontErr)
      triggerSnackbar('載入字型失敗，部分字元可能無法正常顯示', 'warning')
    }

    const pdfBytes = await excelToPdf(wb, {
      font: fontBytes || undefined,
      fitToPage: true,
      pageSize: 'A4',
      orientation: 'portrait',
    })

    const filename = normalizeFileName(props.deckName) || 'deck'
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}_卡组登记表.pdf`
    link.click()
    URL.revokeObjectURL(url)
    triggerSnackbar('PDF 卡表已匯出', 'success')
  } catch (error) {
    console.error('Export PDF failed', error)
    triggerSnackbar('PDF 匯出失敗', 'error')
  }
}

const onDownloadCardList = async () => {
  uiStore.setLoading(true)
  if (selectedExportFormat.value === 'pdf') {
    await exportPDF()
  } else {
    await exportExcel()
  }
  uiStore.setLoading(false)
}
</script>
