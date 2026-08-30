<template>
  <v-card
    id="card-detail"
    ref="cardModalRef"
    :ripple="false"
    v-touch="{
      left: handleSwipeLeft,
      right: handleSwipeRight,
    }"
    @click="handleModalClick"
    class="d-flex flex-column w-100 cursor-auto"
    style="position: relative"
    :class="{
      'overflow-y-auto themed-scrollbar': !$vuetify.display.mdAndUp,
      'overflow-visible': $vuetify.display.mdAndUp,
      'rounded-2lg': $vuetify.display.smAndUp,
    }"
  >
    <v-btn
      icon="i-mdi:close"
      variant="tonal"
      size="small"
      class="close-button"
      @click="emit('close')"
    ></v-btn>

    <v-card-text class="pa-0 d-flex flex-column flex-md-row">
      <div class="image-container flex-shrink-0 d-flex flex-column justify-center">
        <v-hover v-slot="{ isHovering, props: hoverProps }">
          <div
            v-bind="hoverProps"
            class="image-wrapper rounded-5md"
            :class="{ 'light-mode-glowing-border': isLightMode }"
          >
            <v-img
              :src="imgUrl"
              :alt="card.name"
              cover
              :aspect-ratio="400 / 559"
              :lazy-src="blurUrl"
              class="card-image preload-img w-100"
              :class="{ 'hover-scale': isHovering }"
            >
              <template #error>
                <v-img
                  src="/placehold.webp"
                  :aspect-ratio="400 / 559"
                  rounded="lg"
                  cover
                  class="w-100"
                />
              </template>
            </v-img>
            <v-fade-transition>
              <v-btn
                v-if="isHovering || isTouch"
                icon="i-mdi:file-document-arrow-right"
                variant="tonal"
                size="small"
                class="download-text-button"
                @click="handleDownloadText"
              ></v-btn>
            </v-fade-transition>
            <v-fade-transition>
              <v-btn
                v-if="isHovering || isTouch"
                icon="i-mdi:content-copy"
                variant="tonal"
                size="small"
                class="copy-card-button"
                @click="isCopyCardDialogOpen = true"
              ></v-btn>
            </v-fade-transition>
            <v-fade-transition>
              <v-btn
                v-if="isHovering || isTouch"
                icon="i-mdi:download"
                variant="tonal"
                size="small"
                class="download-card-button"
                @click="isDownloadCardDialogOpen = true"
              ></v-btn>
            </v-fade-transition>
          </div>
        </v-hover>
        <div>
          <v-card-actions v-if="showActions" class="d-flex justify-center align-center pa-0 pt-4">
            <v-btn
              icon="i-mdi:minus"
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
              icon="i-mdi:plus"
              size="small"
              variant="tonal"
              color="primary"
              @click="deckStore.addCard(card)"
              :disabled="deckStore.totalCardCount >= 50 && userRole === 0"
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
          <div class="pa-4 pl-md-0">
            <v-card-subtitle class="pb-1 text-body-2 pa-0 pr-8">
              <v-icon size="18" class="mr-1" icon="i-mdi:cube-outline" />
              {{ card.product_name }}
            </v-card-subtitle>

            <v-card-title class="pt-0 text-h5 text-wrap pa-0">
              {{ card.name }}
            </v-card-title>

            <v-card-subtitle class="pt-0 text-body-2 pa-0 mb-4">
              {{ card.id }}
            </v-card-subtitle>

            <div v-if="price != null && route.meta.showCardPrice" class="mb-4 d-flex align-center">
              <span class="font-weight-bold d-flex align-center text-currency">
                <v-icon size="16" class="mr-1" icon="i-mdi:currency-jpy" />
                <span class="font-DINCond text-h6">{{ price }}</span>
              </span>

              <span class="text-caption text-grey d-flex align-center ml-2">
                数据来源 : 遊々亭
                <v-tooltip location="top" open-on-click>
                  <template #activator="{ props: tooltipProps }">
                    <v-icon
                      v-bind="tooltipProps"
                      icon="i-mdi:sync"
                      size="small"
                      class="ml-1"
                      color="teal-lighten-1"
                    />
                  </template>
                  <div class="text-caption">
                    <div v-if="formattedLastUpdate">最近更新: {{ formattedLastUpdate }}</div>
                    <div v-if="formattedNextUpdate">下次更新: {{ formattedNextUpdate }}</div>
                  </div>
                </v-tooltip>
                <v-tooltip
                  text="若卡片编号存在带下划线的平行版本，价格可能未精确细分，请自行确认"
                  location="top"
                  open-on-click
                >
                  <template #activator="{ props: tooltipProps }">
                    <v-icon
                      v-bind="tooltipProps"
                      icon="i-mdi:help-circle-outline"
                      size="small"
                      class="ml-1"
                      color="warning"
                    />
                  </template>
                </v-tooltip>
              </span>
            </div>

            <v-row dense class="my-4 text-center">
              <v-col>
                <div class="text-body-2 text-grey">等级</div>
                <div class="font-wenkai font-weight-bold text-body-1">{{ card.level }}</div>
              </v-col>
              <v-col>
                <div class="text-body-2 text-grey">费用</div>
                <div class="font-wenkai font-weight-bold text-body-1">{{ card.cost }}</div>
              </v-col>
              <v-col>
                <div class="text-body-2 text-grey">战斗力</div>
                <div class="font-wenkai font-weight-bold text-body-1">{{ card.power }}</div>
              </v-col>
              <v-col>
                <div class="text-body-2 text-grey">灵魂值</div>
                <div class="font-wenkai font-weight-bold text-body-1">{{ card.soul }}</div>
              </v-col>
            </v-row>
            <v-divider class="mb-4"></v-divider>
            <div>
              <div class="text-body-2 mb-2 text-grey d-flex align-center">
                <v-icon size="18" class="mr-1" icon="i-mdi:information-outline" />
                效果
                <v-btn
                  prepend-icon="i-mdi:flag-outline"
                  variant="tonal"
                  color="warning"
                  size="small"
                  density="compact"
                  class="ml-1 rounded-pill"
                  text="回报错误"
                  @click="openReportDialog"
                >
                </v-btn>
              </div>
              <div class="font-wenkai text-body-1" v-html="formattedEffect"></div>
            </div>
            <div v-if="card.trait && card.trait.length > 0 && card.trait[0] !== '-'" class="mt-4">
              <div class="text-body-2 mb-2 text-grey">
                <v-icon size="18" class="mr-1" icon="i-mdi:feather" />
                特征
              </div>
              <v-chip
                v-for="r in card.trait"
                :key="r"
                class="font-wenkai mr-2 mb-2"
                label
                rounded="pill"
                :link="isFilterable"
                @click="isFilterable ? handleTraitClick(r) : undefined"
                :color="
                  isFilterable && activeFilterStore.selectedTraits.includes(r)
                    ? isLightMode
                      ? 'indigo-darken-3'
                      : 'indigo-lighten-3'
                    : undefined
                "
              >
                {{ r }}
                <v-tooltip
                  v-if="isFilterable"
                  activator="parent"
                  location="top"
                  :disabled="isTouch"
                >
                  {{
                    activeFilterStore.selectedTraits.includes(r)
                      ? '移除此特征筛选'
                      : '添加此特征筛选'
                  }}
                </v-tooltip>
              </v-chip>
            </div>
            <div v-if="card.link && card.link.length > 0" :key="`${card.id}-links`" class="mt-4">
              <div class="text-body-2 mb-2 text-grey">
                <v-icon size="18" class="mr-1" icon="i-mdi:link-variant" />
                关联卡片
              </div>
              <v-slide-y-reverse-transition mode="out-in">
                <div :key="isLoadingLinks ? 'loading' : 'content'">
                  <!-- Loading -->
                  <div v-if="isLoadingLinks" class="d-flex justify-center align-center pa-4 mx-4">
                    <v-progress-linear indeterminate color="primary" />
                  </div>

                  <!-- Linked cards -->
                  <div v-else class="linked-cards-grid">
                    <LinkedCard
                      v-for="linkedCard in linkedCards"
                      :key="linkedCard.id"
                      :card="linkedCard"
                      @show-details="handleShowNewCard"
                    />
                  </div>
                </div>
              </v-slide-y-reverse-transition>
            </div>

            <div
              v-if="card.parallelCards && card.parallelCards.length > 0"
              :key="`${card.id}-parallels`"
              class="mt-4"
            >
              <div class="text-body-2 mb-2 text-grey">
                <v-icon size="18" class="mr-1" icon="i-mdi:star-four-points-outline" />
                {{ card.isLowestRarity ? '高罕卡片' : '低罕卡片' }}
              </div>
              <v-slide-y-reverse-transition mode="out-in">
                <div :key="isLoadingParallels ? 'loading' : 'content'">
                  <!-- Loading -->
                  <div
                    v-if="isLoadingParallels"
                    class="d-flex justify-center align-center pa-4 mx-4"
                  >
                    <v-progress-linear indeterminate color="primary" />
                  </div>

                  <!-- Parallel cards -->
                  <div v-else class="linked-cards-grid">
                    <LinkedCard
                      v-for="parallelCard in parallelCards"
                      :key="parallelCard.id"
                      :card="parallelCard"
                      @show-details="handleShowNewCard"
                    />
                  </div>
                </div>
              </v-slide-y-reverse-transition>
            </div>
          </div>
        </div>
      </div>
    </v-card-text>
    <v-btn
      icon="i-mdi:chevron-left"
      variant="tonal"
      class="nav-button-left"
      :class="{ 'button-hidden': !navButtonsVisible }"
      @click="emit('prev-card')"
      :disabled="cardIndex === 0"
    ></v-btn>
    <v-btn
      icon="i-mdi:chevron-right"
      variant="tonal"
      class="nav-button-right"
      :class="{ 'button-hidden': !navButtonsVisible }"
      @click="handleNextCard"
      :disabled="cardIndex === totalCards - 1"
    ></v-btn>

    <DownloadTextDialog
      v-if="isDownloadTextDialogOpen"
      v-model="isDownloadTextDialogOpen"
      @confirm="executeDownloadText"
    />

    <!-- Copy Card Option Dialog -->
    <v-dialog v-if="isCopyCardDialogOpen" v-model="isCopyCardDialogOpen" max-width="300">
      <v-card class="rounded-2lg pa-2">
        <v-card-title class="text-subtitle-1">选择复制版本</v-card-title>
        <v-list nav density="compact">
          <v-list-item
            v-if="card.type !== '高潮卡'"
            prepend-icon="i-mdi:card-text-outline"
            title="包含效果文字"
            @click="handleCopyCard(true)"
          ></v-list-item>
          <v-list-item
            prepend-icon="i-mdi:image-outline"
            title="原图"
            @click="handleCopyCard(false)"
          ></v-list-item>
        </v-list>
      </v-card>
    </v-dialog>

    <!-- Download Card Option Dialog -->
    <v-dialog v-if="isDownloadCardDialogOpen" v-model="isDownloadCardDialogOpen" max-width="300">
      <v-card class="rounded-2lg pa-2">
        <v-card-title class="text-subtitle-1">选择下载版本</v-card-title>
        <v-list nav density="compact">
          <v-list-item
            v-if="card.type !== '高潮卡'"
            prepend-icon="i-mdi:card-text-outline"
            title="包含效果文字"
            @click="handleDownloadCard(true)"
          ></v-list-item>
          <v-list-item
            prepend-icon="i-mdi:image-outline"
            title="原图"
            @click="handleDownloadCard(false)"
          ></v-list-item>
        </v-list>
      </v-card>
    </v-dialog>

    <!-- Translation Report Dialog -->
    <v-dialog v-if="isReportDialogOpen" v-model="isReportDialogOpen" max-width="500">
      <v-card class="rounded-2lg pa-4">
        <v-card-title class="px-0 pt-0 text-subtitle-1 font-weight-bold d-flex align-center">
          <v-icon icon="i-mdi:flag-outline" class="mr-2" color="warning" size="20" />
          回报错误
        </v-card-title>
        <v-card-text class="px-0 py-2">
          <div class="text-body-2 text-grey mb-3">
            如果您发现此卡片的效果、特征等信息有误，请在下方填写错误说明。
          </div>
          <v-textarea
            v-model="reportReason"
            label="回报原因 (限 100 字)"
            placeholder="例如：原效果是'送入休息室'，翻译成了'送入回忆区'..."
            variant="outlined"
            rows="3"
            hide-details="auto"
            :counter="100"
            maxlength="100"
            class="themed-scrollbar"
            :rules="[(v) => (v || '').length <= 100 || '字数不能超过 100 字']"
          ></v-textarea>
        </v-card-text>
        <v-card-actions class="px-0 pb-0 pt-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="isReportDialogOpen = false">取消</v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            :loading="isSubmittingReport"
            :disabled="!reportReason.trim()"
            @click="submitReport"
          >
            提交
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { computed, ref, onUnmounted, onMounted, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { storeToRefs } from 'pinia'
import LinkedCard from './LinkedCard.vue'
import DownloadTextDialog from './DownloadTextDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useDeckStore } from '@/stores/deck'
import { useDownloadStore } from '@/stores/download'
import { convertElementToPng } from '@/utils/domToImage.js'
import { getOverlayStyle, getIconStyle } from '@/utils/overlayStyle'
import { useSnackbar } from '@/composables/useSnackbar'
import { writeImage } from '@/utils/clipboard'
import { useRoute } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { useFilterStore } from '@/stores/filter'
import { useGlobalSearchStore } from '@/stores/globalSearch'
import { useDevice } from '@/composables/useDevice'
import { formatEffectToHtml } from '@/utils/cardEffectFormatter'
import { usePriceStore } from '@/stores/price'
import { fetchCardByIdAndPrefix, getCardSeriesId } from '@/utils/card'
import { sortCards } from '@/utils/cardsSort'
import { useModalTransition } from '@/composables/useModalTransition'

const { triggerSnackbar } = useSnackbar()
const { smAndUp } = useDisplay()
const route = useRoute()
const uiStore = useUIStore()
const filterStore = useFilterStore()
const globalSearchStore = useGlobalSearchStore()
const downloadStore = useDownloadStore()
const priceStore = usePriceStore()
const { waitForTransition } = useModalTransition()

const cardModalRef = ref(null)

const emit = defineEmits(['close', 'show-new-card', 'prev-card', 'next-card', 'load-more'])

const props = defineProps({
  card: { type: Object, required: true },
  imgUrl: { type: String, required: true },
  blurUrl: { type: String, required: true },
  price: { type: [String, Number], default: null },
  priceUpdateTimes: { type: Object, default: null },
  showActions: { type: Boolean, default: false },
  cardIndex: { type: Number, default: 0 },
  totalCards: { type: Number, default: 1 },
})

const authStore = useAuthStore()
const { userRole } = storeToRefs(authStore)
const deckStore = useDeckStore()
const { isTouch } = useDevice()
const isLightMode = computed(() => uiStore.theme === 'light')

const isFilterable = computed(() => ['SeriesDetail', 'GlobalSearch'].includes(route.name))
const activeFilterStore = computed(() =>
  route.name === 'GlobalSearch' ? globalSearchStore : filterStore
)

const isDownloadTextDialogOpen = ref(false)
const isDownloadCardDialogOpen = ref(false)
const isCopyCardDialogOpen = ref(false)
const isReportDialogOpen = ref(false)
const reportReason = ref('')
const isSubmittingReport = ref(false)

const showOnTap = ref(false)
let hideTimeout = null

const navButtonsVisible = computed(() => {
  return smAndUp.value || showOnTap.value
})

const handleModalClick = () => {
  if (isTouch.value || !smAndUp.value) {
    showOnTap.value = true
    if (hideTimeout) {
      clearTimeout(hideTimeout)
    }
    hideTimeout = setTimeout(() => {
      showOnTap.value = false
    }, 1000)
  }
}

const handleTraitClick = (trait) => {
  if (!isFilterable.value) return

  const traits = activeFilterStore.value.selectedTraits
  const index = activeFilterStore.value.selectedTraits.indexOf(trait)
  if (index === -1) {
    activeFilterStore.value.selectedTraits = [...traits, trait]
    triggerSnackbar(`已添加特征筛选: ${trait}`)
  } else {
    activeFilterStore.value.selectedTraits = traits.filter((t) => t !== trait)
    triggerSnackbar(`已移除特征筛选: ${trait}`)
  }
}

const handleKeydown = (e) => {
  if (isDownloadTextDialogOpen.value) return

  switch (e.key) {
    case 'ArrowLeft':
      if (props.cardIndex !== 0) {
        emit('prev-card')
      }
      break
    case 'ArrowRight':
      if (props.cardIndex !== props.totalCards - 1) {
        handleNextCard()
      }
      break
    case 'ArrowUp':
      if (props.showActions) {
        e.preventDefault()
        const isDeckFull = deckStore.totalCardCount >= 50 && userRole.value === 0
        if (!isDeckFull) {
          deckStore.addCard(props.card)
        }
      }
      break
    case 'ArrowDown':
      if (props.showActions) {
        e.preventDefault()
        if (cardCount.value > 0) {
          deckStore.removeCard(props.card.id)
        }
      }
      break
  }
}

// ─── 关联卡与平行卡延后加载状态 ─────────────
// 弹窗自主管理关联卡与平行卡数据，等待进场动画完成后异步加载以确保 60fps 流畅体验

const linkedCards = ref([])
const isLoadingLinks = ref(false)
const parallelCards = ref([])
const isLoadingParallels = ref(false)

/**
 * 获取指定卡牌的当前市场价格。
 * @param {object} targetCard 目标卡牌对象
 * @returns {string|null} 格式化后的价格字符串或 null
 */
const getCardPrice = (targetCard) => {
  const infos = getCardSeriesId(targetCard.cardIdPrefix)
  if (!infos || infos.length === 0) return null

  for (const info of infos) {
    const p = priceStore.getPrice(info.id, targetCard.id)
    if (p) {
      return p.toLocaleString()
    }
  }
  return null
}

/** 当前异步请求批次编号，用于在快速切换卡牌或组件卸载时消除竞态效应 */
let currentCardRequestId = 0

/**
 * 延后加载关联卡与平行卡详情数据。
 *
 * 核心优化策略：
 * 1. 优先等待弹窗进场 CSS 动画彻底完成。
 * 2. 动效完成后，异步批量请求关联卡与平行卡数据，并在后台完成价格计算与排序。
 * 3. 通过 requestId 严格校验，防止前后卡牌切换时的异步竞态乱序覆盖。
 *
 * @param {object} targetCard 当前展示的卡牌对象
 */
const loadSecondaryCards = async (targetCard) => {
  if (!targetCard || !targetCard.id) return

  const requestId = ++currentCardRequestId
  isLoadingLinks.value = true
  isLoadingParallels.value = true
  linkedCards.value = []
  parallelCards.value = []

  // 1. 等待弹窗进场动画彻底完成（基于原生 DOM transitionend + 350ms 超时保底）
  await waitForTransition(cardModalRef)

  // 若已发生卡牌切换或组件已注销，丢弃当前批次
  if (requestId !== currentCardRequestId || !targetCard.id) return

  try {
    const cardData = await fetchCardByIdAndPrefix(targetCard.id, targetCard.cardIdPrefix)
    if (requestId !== currentCardRequestId || !cardData) return

    // 2. 异步处理关联卡列表
    if (cardData.link && Array.isArray(cardData.link) && cardData.link.length > 0) {
      const linkedList = await Promise.all(
        cardData.link.map((id) => fetchCardByIdAndPrefix(id, cardData.cardIdPrefix))
      )
      if (requestId === currentCardRequestId) {
        const flatCards = linkedList.filter(Boolean)
        const cardsWithPrice = flatCards.map((c) => ({
          ...c,
          price: getCardPrice(c),
        }))
        linkedCards.value = sortCards(cardsWithPrice)
      }
    } else {
      linkedCards.value = []
    }
    isLoadingLinks.value = false

    // 3. 异步处理平行卡（高罕/低罕）列表
    if (
      cardData.parallelCards &&
      Array.isArray(cardData.parallelCards) &&
      cardData.parallelCards.length > 0
    ) {
      const parallelList = await Promise.all(
        cardData.parallelCards.map((id) => fetchCardByIdAndPrefix(id, cardData.cardIdPrefix))
      )
      if (requestId === currentCardRequestId) {
        const flatCards = parallelList.filter(Boolean)
        const cardsWithPrice = flatCards.map((c) => ({
          ...c,
          price: getCardPrice(c),
        }))
        parallelCards.value = sortCards(cardsWithPrice)
      }
    } else {
      parallelCards.value = []
    }
    isLoadingParallels.value = false
  } catch (err) {
    console.error('Failed to fetch secondary cards in modal:', err)
  } finally {
    if (requestId === currentCardRequestId) {
      isLoadingLinks.value = false
      isLoadingParallels.value = false
    }
  }
}

// 监听卡牌 ID 切换（如下一张/上一张/关联卡跳转），自动重新加载对应的关联数据
watch(
  () => props.card?.id,
  () => {
    loadSecondaryCards(props.card)
  }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  loadSecondaryCards(props.card)
})

onUnmounted(() => {
  currentCardRequestId++
  window.removeEventListener('keydown', handleKeydown)
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
})

const cardCount = computed(() => {
  return props.card ? deckStore.getCardCount(props.card.id) : 0
})

const formattedEffect = computed(() => {
  return formatEffectToHtml(props.card?.effect)
})

const handleDownloadText = () => {
  isDownloadTextDialogOpen.value = true
}

const executeDownloadText = async () => {
  isDownloadTextDialogOpen.value = false
  uiStore.setLoading(true)

  const exportContainer = document.createElement('div')
  exportContainer.id = 'temp-text-export-container'

  exportContainer.style.position = 'absolute'
  exportContainer.style.left = '-9999px'
  exportContainer.style.top = '-9999px'
  exportContainer.style.width = `${downloadStore.textWidth}px`
  exportContainer.style.backgroundColor = downloadStore.textBgColor
  exportContainer.style.borderRadius = `${downloadStore.textBorderRadius}px`
  exportContainer.style.padding = '20px'
  exportContainer.style.boxSizing = 'border-box'
  exportContainer.style.fontFamily = 'LXGW WenKai Lite, system-ui, sans-serif'
  exportContainer.style.display = 'flex'
  exportContainer.style.alignItems = 'center'
  exportContainer.style.justifyContent = 'center'

  const effectText = document.createElement('div')
  effectText.innerHTML = formattedEffect.value
  effectText.style.fontSize = `${downloadStore.textFontSize}px`
  effectText.style.lineHeight = `${downloadStore.textLineHeight}px`
  effectText.style.wordBreak = 'break-word'
  effectText.style.textAlign = 'justify'
  effectText.style.width = '100%'
  effectText.style.color = downloadStore.textColor

  effectText.querySelectorAll('img').forEach((icon) => {
    icon.crossOrigin = 'anonymous'
    icon.style.height = `${downloadStore.textFontSize}px`
    icon.style.verticalAlign = '-0.15em'
    icon.style.display = 'inline-block'
  })

  exportContainer.appendChild(effectText)
  document.body.appendChild(exportContainer)

  try {
    const filename = `${props.card.id}-effect`
    await convertElementToPng('temp-text-export-container', filename, 1, true)
    triggerSnackbar('效果文本图片已成功汇出', 'success')
  } catch (error) {
    console.error('Failed to export card text image:', error)
    triggerSnackbar(`导出失败: ${error.message || '未知错误'}`, 'error')
  } finally {
    document.body.removeChild(exportContainer)
    uiStore.setLoading(false)
  }
}

// ─── 无文字模式：直接下载原图 ──────────────────────────────────

const downloadOriginalImage = async () => {
  await new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d').drawImage(img, 0, 0)

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas 转换 Blob 失败'))
        const objectUrl = URL.createObjectURL(blob)
        triggerDownload(objectUrl, `${normalizeFileName(props.card.id)}.png`)
        URL.revokeObjectURL(objectUrl)
        resolve()
      }, 'image/png')
    }

    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = props.imgUrl
  })
}

// ─── 有文字模式：生成带文字覆层的图片 ─────────────────────────

const buildExportContainer = () => {
  const container = document.createElement('div')
  Object.assign(container, { id: 'temp-export-container' })
  Object.assign(container.style, {
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    width: '400px',
    height: '557px',
    borderRadius: '8px',
    overflow: 'hidden',
  })

  const img = document.createElement('img')
  Object.assign(img, { crossOrigin: 'anonymous', src: props.imgUrl })
  Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' })

  // 文字覆层 — 使用共享样式确保与 PDF 视觉一致
  const overlay = document.createElement('div')
  Object.assign(overlay.style, getOverlayStyle(400, props.card.type))

  // 效果文字（fontSize / lineHeight / textAlign 等从 overlay 继承）
  const effectText = document.createElement('div')
  effectText.innerHTML = formattedEffect.value

  // 设置图标跨域与尺寸
  const iconSt = getIconStyle(400)
  effectText.querySelectorAll('img').forEach((icon) => {
    Object.assign(icon, { crossOrigin: 'anonymous' })
    Object.assign(icon.style, iconSt)
  })

  overlay.appendChild(effectText)
  container.append(img, overlay)
  return container
}

const downloadCardWithText = async () => {
  const exportContainer = buildExportContainer()
  document.body.appendChild(exportContainer)
  try {
    await convertElementToPng('temp-export-container', props.card.id || 'card', 2, true)
    triggerSnackbar('图片已成功导出', 'success')
  } catch (error) {
    console.error('导出卡片图片失败:', error)
    triggerSnackbar(`导出失败: ${error.message || '未知错误'}`, 'error')
  } finally {
    document.body.removeChild(exportContainer)
  }
}

const handleDownloadCard = async (withText = true) => {
  isDownloadCardDialogOpen.value = false
  uiStore.setLoading(true)
  try {
    if (withText) {
      await downloadCardWithText()
    } else {
      await downloadOriginalImage()
      triggerSnackbar('图片已成功导出', 'success')
    }
  } catch (error) {
    console.error('下载卡片失败:', error)
    triggerSnackbar(`导出失败: ${error.message || '未知错误'}`, 'error')
  } finally {
    uiStore.setLoading(false)
  }
}

const copyOriginalImage = async () => {
  const blob = await new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d').drawImage(img, 0, 0)
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas 转换 Blob 失败'))),
        'image/png'
      )
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = props.imgUrl
  })
  await writeImage(blob)
}

const copyCardWithText = async () => {
  const exportContainer = buildExportContainer()
  document.body.appendChild(exportContainer)
  try {
    const blob = await convertElementToPng(
      'temp-export-container',
      props.card.id || 'card',
      2,
      true,
      false
    )
    if (blob) await writeImage(blob)
  } finally {
    document.body.removeChild(exportContainer)
  }
}

const handleCopyCard = async (withText = true) => {
  isCopyCardDialogOpen.value = false
  uiStore.setLoading(true)
  try {
    if (withText) {
      await copyCardWithText()
    } else {
      await copyOriginalImage()
    }
    triggerSnackbar('图片已复制', 'success')
  } catch (error) {
    console.error('复制卡片失败:', error)
    triggerSnackbar(`复制失败: ${error.message || '未知错误'}`, 'error')
  } finally {
    uiStore.setLoading(false)
  }
}

const handleShowNewCard = (payload) => {
  emit('show-new-card', payload)
}

const formatDateTime = (timestamp) => {
  if (!timestamp) return null
  const date = new Date(timestamp)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formattedLastUpdate = computed(() => {
  return props.priceUpdateTimes?.lastUpdate
    ? formatDateTime(props.priceUpdateTimes.lastUpdate)
    : null
})

const formattedNextUpdate = computed(() => {
  return props.priceUpdateTimes?.nextUpdate
    ? formatDateTime(props.priceUpdateTimes.nextUpdate)
    : null
})

const handleNextCard = () => {
  if (props.cardIndex >= props.totalCards - 5) {
    emit('load-more')
  }
  emit('next-card')
}

const handleSwipeLeft = () => {
  const selection = window.getSelection()
  if (selection && selection.toString().length > 0) return

  if (props.cardIndex !== props.totalCards - 1) {
    handleNextCard()
  }
}

const handleSwipeRight = () => {
  const selection = window.getSelection()
  if (selection && selection.toString().length > 0) return

  if (props.cardIndex !== 0) {
    emit('prev-card')
  }
}

const openReportDialog = () => {
  reportReason.value = ''
  isReportDialogOpen.value = true
}

const submitReport = async () => {
  if (!reportReason.value.trim()) return

  isSubmittingReport.value = true
  try {
    const response = await fetch('/api/reports/translation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardId: props.card.baseId,
        reason: reportReason.value.trim(),
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || '提交失败')
    }
    triggerSnackbar('回报提交成功，感谢您的帮助！', 'success')
    isReportDialogOpen.value = false
  } catch (error) {
    triggerSnackbar(`提交失败: ${error.message || '未知错误'}`, 'error')
  } finally {
    isSubmittingReport.value = false
  }
}
</script>

<style scoped>
#card-detail :deep(.v-card__overlay) {
  display: none !important;
}

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

.download-text-button {
  position: absolute;
  bottom: 102px;
  right: 8px;
  z-index: 1;
  background-color: rgba(0, 0, 0, 0.6) !important;
  color: white !important;
}

.copy-card-button {
  position: absolute;
  bottom: 55px;
  right: 8px;
  z-index: 1;
  background-color: rgba(0, 0, 0, 0.6) !important;
  color: white !important;
}

.download-card-button {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 1;
  background-color: rgba(0, 0, 0, 0.6) !important;
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
  transition: opacity 0.3s ease-out;
}

.button-hidden {
  opacity: 0 !important;
  pointer-events: none;
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
  .close-button {
    position: absolute;
    top: 12px;
    right: 12px;
  }

  .nav-button-left,
  .nav-button-right {
    position: absolute;
  }

  .nav-button-left {
    left: -56px;
  }

  .nav-button-right {
    right: -56px;
  }
}

.nav-button-sm {
  background-color: rgba(0, 0, 0, 0.6) !important;
  color: white !important;
}

.image-wrapper {
  position: relative;
  overflow: visible;
  transition: filter 0.3s ease-out;
}

.image-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: white;
  opacity: 0;
  z-index: -1;
  filter: blur(8px);
  transition: opacity 0.3s ease-out;
}

.image-wrapper.light-mode-glowing-border::after {
  background: black;
}

.image-wrapper:hover::after {
  opacity: 0.8;
}

.card-image {
  transition: transform 0.3s ease-out;
  border-radius: inherit;
}

.card-image :deep(.v-img__img) {
  transform: scale(1.005);
  transform-origin: center;
}

.card-image.hover-scale {
  transform: scale(1.02);
}

.image-container {
  padding: 16px;
  width: 100%;
  max-width: 400px;
  align-self: center;
  position: relative;
}

@media (min-width: 960px) {
  .image-container {
    width: 38%;
    max-width: 380px;
    padding: 20px;
  }
}

.linked-cards-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

@media (max-width: 959px) {
  .linked-cards-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
}

@media (max-width: 599px) {
  .linked-cards-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
}
</style>
