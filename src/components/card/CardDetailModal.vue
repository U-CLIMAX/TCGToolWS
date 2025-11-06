<template>
  <v-card
    id="card-detail"
    class="d-flex flex-column w-100"
    style="position: relative"
    :class="{
      'overflow-y-auto themed-scrollbar': !$vuetify.display.mdAndUp,
      'overflow-visible': $vuetify.display.mdAndUp,
    }"
  >
    <v-btn
      v-if="card.type != '高潮卡'"
      icon="mdi-download"
      variant="tonal"
      size="small"
      class="download-button"
      @click="handleDownloadCard"
    ></v-btn>
    <v-btn
      icon="mdi-close"
      variant="tonal"
      size="small"
      class="close-button"
      @click="emit('close')"
    ></v-btn>

    <v-card-text class="pa-0 d-flex flex-column flex-md-row">
      <div
        class="image-container flex-shrink-0 d-flex flex-column justify-center pa-4"
        :style="{
          width: $vuetify.display.mdAndUp ? '40%' : '100%',
          maxWidth: '400px',
          alignSelf: 'center',
          position: 'relative',
        }"
      >
        <v-img
          :src="imgUrl"
          :alt="card.name"
          rounded="5md"
          cover
          :aspect-ratio="400 / 559"
          :max-width="400"
          lazy-src="/empty-placehold.webp"
        >
          <template #placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
            </div>
          </template>
          <template #error>
            <v-img
              src="/placehold.webp"
              :aspect-ratio="400 / 559"
              rounded="5md"
              cover
              :max-width="400"
            />
          </template>
        </v-img>
        <div>
          <v-card-actions v-if="showActions" class="d-flex justify-center align-center pa-0 pt-4">
            <v-btn
              icon="mdi-minus"
              size="small"
              variant="tonal"
              color="primary"
              @click="deckStore.removeCard(card.id)"
              :disabled="cardCount === 0"
            ></v-btn>
            <div class="mx-4 text-h6 font-weight-bold" style="min-width: 20px; text-align: center">
              {{ cardCount }}
            </div>
            <v-btn
              icon="mdi-plus"
              size="small"
              variant="tonal"
              color="primary"
              @click="deckStore.addCard(card)"
              :disabled="deckStore.isDeckFull"
            ></v-btn>
          </v-card-actions>
        </div>
      </div>

      <div
        class="flex-grow-1"
        :style="{ position: $vuetify.display.mdAndUp ? 'relative' : 'static', minWidth: 0 }"
      >
        <div
          class="themed-scrollbar flex-grow-1 w-100"
          :class="{
            'position-absolute': $vuetify.display.mdAndUp,
            'overflow-y-auto': $vuetify.display.mdAndUp,
            'fill-height fill-width': $vuetify.display.mdAndUp,
          }"
          :style="{ overflowY: $vuetify.display.mdAndUp ? undefined : 'visible' }"
        >
          <div class="pa-4">
            <v-card-subtitle class="pb-1 text-body-2 pa-0">
              {{ card.product_name }}
            </v-card-subtitle>
            <v-card-title class="pt-0 text-h5 text-wrap pa-0">{{ card.name }}</v-card-title>
            <v-card-subtitle class="pt-0 text-body-2 pa-0 mb-4">
              {{ card.id }}
            </v-card-subtitle>

            <v-row dense class="my-4 text-center">
              <v-col>
                <div class="text-body-2 text-grey">等级</div>
                <div class="font-weight-bold text-body-1">{{ card.level }}</div>
              </v-col>
              <v-col>
                <div class="text-body-2 text-grey">费用</div>
                <div class="font-weight-bold text-body-1">{{ card.cost }}</div>
              </v-col>
              <v-col>
                <div class="text-body-2 text-grey">战斗力</div>
                <div class="font-weight-bold text-body-1">{{ card.power }}</div>
              </v-col>
              <v-col>
                <div class="text-body-2 text-grey">灵魂值</div>
                <div class="font-weight-bold text-body-1">{{ card.soul }}</div>
              </v-col>
            </v-row>
            <v-divider class="mb-4"></v-divider>
            <div>
              <div class="text-body-2 mb-2 text-grey">效果</div>
              <div class="text-body-1" v-html="formattedEffect"></div>
            </div>
            <div v-if="card.trait && card.trait.length > 0 && card.trait[0] !== '-'" class="mt-4">
              <div class="text-body-2 mb-2 text-grey">特征</div>
              <v-chip v-for="r in card.trait" :key="r" class="mr-2 mb-2" label>{{ r }}</v-chip>
            </div>
            <div v-if="linkedCards && linkedCards.length > 0" class="mt-4">
              <div class="text-body-2 mb-2 text-grey">关联卡片</div>
              <div v-if="isLoadingLinks" class="d-flex justify-center align-center pa-4">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
              </div>
              <v-row v-else dense>
                <v-col v-for="card in linkedCards" :key="card.id" cols="6" sm="4" md="3" lg="2">
                  <LinkedCard :card="card" @show-details="handleShowNewCard" />
                </v-col>
              </v-row>
            </div>
          </div>
        </div>
      </div>
    </v-card-text>
    <v-btn
      icon="mdi-chevron-left"
      variant="tonal"
      class="nav-button-left"
      @click="emit('prev-card')"
      :disabled="cardIndex === 0"
    ></v-btn>
    <v-btn
      icon="mdi-chevron-right"
      variant="tonal"
      class="nav-button-right"
      @click="handleNextCard"
      :disabled="cardIndex === totalCards - 1"
    ></v-btn>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import LinkedCard from './LinkedCard.vue'
import DOMPurify from 'dompurify'
import { useDeckStore } from '@/stores/deck'
import { convertElementToPng } from '@/utils/domToImage.js'
import { useSnackbar } from '@/composables/useSnackbar'
import { useUIStore } from '@/stores/ui'

const { triggerSnackbar } = useSnackbar()
const uiStore = useUIStore()

const emit = defineEmits(['close', 'show-new-card', 'prev-card', 'next-card', 'load-more'])

const props = defineProps({
  card: { type: Object, required: true },
  imgUrl: { type: String, required: true },
  linkedCards: { type: Array, default: () => [] },
  isLoadingLinks: { type: Boolean, default: false },
  showActions: { type: Boolean, default: false },
  cardIndex: { type: Number, default: 0 },
  totalCards: { type: Number, default: 1 },
})
const deckStore = useDeckStore()

const cardCount = computed(() => {
  return props.card ? deckStore.getCardCount(props.card.id) : 0
})

const ICON_MAP = {
  '【CX联动】': 'cx',
  '【自】': 'auto',
  '【永】': 'cont',
  '【起】': 'act',
  '竖置': 'stand',
  '【竖置】': 'stand',
  '横置': 'rest',
  '【横置】': 'rest',
  '【反击】': 'backup',
  '【倒置】': 'reversed',
  '倒置': 'reversed',
}
const ICON_REGEX = new RegExp(Object.keys(ICON_MAP).join('|'), 'g')
const formattedEffect = computed(() => {
  const rawEffect = props.card.effect || '无'

  let replaced = rawEffect.replace(ICON_REGEX, (match) => {
    const icon = ICON_MAP[match]
    return icon ? ` <img src="/effect-icons/${icon}.svg"> ` : match
  })

  // 補上缺少 inline-icon 的 img
  replaced = replaced.replace(/<img\b(?![^>]*\bclass=)/g, '<img class="inline-icon"')

  return DOMPurify.sanitize(replaced)
})

const handleDownloadCard = async () => {
  uiStore.setLoading(true)

  const exportContainer = document.createElement('div')
  exportContainer.id = 'temp-export-container'

  exportContainer.style.position = 'absolute'
  exportContainer.style.left = '-9999px'
  exportContainer.style.top = '-9999px'
  exportContainer.style.width = '400px'
  exportContainer.style.height = '557px'
  exportContainer.style.borderRadius = '8px'
  exportContainer.style.overflow = 'hidden'
  exportContainer.style.fontFamily = 'system-ui, sans-serif'

  const img = document.createElement('img')
  img.crossOrigin = 'anonymous'
  img.src = props.imgUrl
  img.style.width = '100%'
  img.style.height = '100%'
  img.style.objectFit = 'cover'
  img.style.display = 'block'

  const overlay = document.createElement('div')
  overlay.style.position = 'absolute'
  overlay.style.bottom = props.card.type === '事件卡' ? '53px' : '67px'
  overlay.style.left = '12px'
  overlay.style.right = '12px'
  overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.85)'
  overlay.style.color = 'black'
  overlay.style.padding = '10px'
  overlay.style.boxSizing = 'border-box'
  overlay.style.borderRadius = '8px'

  const effectText = document.createElement('div')
  effectText.innerHTML = formattedEffect.value
  effectText.style.fontSize = '0.9rem'
  effectText.style.lineHeight = '1.2'
  effectText.style.wordBreak = 'break-word'
  effectText.style.textAlign = 'justify'

  effectText.querySelectorAll('img').forEach((icon) => {
    let src = icon.getAttribute('src')
    if (src && src.endsWith('.svg')) {
      icon.setAttribute('src', src.replace(/\.svg$/, '.webp'))
    }

    icon.crossOrigin = 'anonymous'
    icon.style.height = '0.9rem'
    icon.style.verticalAlign = '-0.15rem'
    icon.style.margin = '0 2px'
    icon.style.display = 'inline-block'
  })

  overlay.appendChild(effectText)

  exportContainer.appendChild(img)
  exportContainer.appendChild(overlay)

  document.body.appendChild(exportContainer)

  try {
    const images = Array.from(exportContainer.querySelectorAll('img'))
    const imageLoadPromises = images.map(
      (image) =>
        new Promise((resolve) => {
          if (image.complete) {
            resolve()
          } else {
            image.onload = resolve
            image.onerror = resolve
          }
        })
    )

    await Promise.all(imageLoadPromises)
    // wait for browser to render (100ms + 2rAF)
    await new Promise((resolve) => setTimeout(resolve, 100))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))

    const filename = props.card.id || 'card'
    await convertElementToPng('temp-export-container', filename, 1)

    triggerSnackbar('图片已成功汇出', 'success')
  } catch (error) {
    console.error('Failed to export card image:', error)
    triggerSnackbar(`导出失败: ${error.message || '未知错误'}`, 'error')
  } finally {
    document.body.removeChild(exportContainer)
    uiStore.setLoading(false)
  }
}

const handleShowNewCard = (payload) => {
  emit('show-new-card', payload)
}

const handleNextCard = () => {
  if (props.cardIndex >= props.totalCards - 5) {
    emit('load-more')
  }
  emit('next-card')
}
</script>

<style scoped>
.v-card-title.text-wrap {
  white-space: normal;
}

.close-button {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 15;
  background-color: rgba(0, 0, 0, 0.6) !important;
  color: white !important;
}

.download-button {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 15;
  background-color: rgba(0, 0, 0, 0.8) !important;
  color: white !important;
}

.nav-button-left,
.nav-button-right {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(0, 0, 0, 0.6) !important;
  color: white !important;
  z-index: 15;
}

.nav-button-left {
  left: 12px;
}

.nav-button-right {
  right: 12px;
}

.nav-button-left.v-btn--disabled,
.nav-button-right.v-btn--disabled {
  pointer-events: auto;
  cursor: default;
}

@media (min-width: 960px) {
  .nav-button-left,
  .nav-button-right {
    position: absolute;
  }

  .nav-button-left {
    left: -60px;
  }

  .nav-button-right {
    right: -60px;
  }
}

.nav-button-sm {
  background-color: rgba(0, 0, 0, 0.6) !important;
  color: white !important;
}
</style>
