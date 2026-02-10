<template>
  <div class="h-100">
    <v-container fluid class="h-100 pa-0">
      <div class="d-flex flex-column h-100 overflow-hidden">
        <div ref="headerRef" class="overlay-header pl-4 pr-4 pa-1">
          <div class="overlay-header-content">
            <!-- 左側 -->
            <div class="header-left">
              <template v-if="smAndUp">
                <v-btn
                  :size="resize"
                  icon="mdi-export-variant"
                  variant="text"
                  @click="openExportDialog"
                  v-tooltip:bottom="'汇出卡组'"
                ></v-btn>
                <v-btn
                  :size="resize"
                  icon="mdi-share-variant"
                  variant="text"
                  :disabled="isLocalDeck"
                  @click="handleShareCard"
                  v-tooltip:bottom="'分享卡组'"
                ></v-btn>
                <v-btn
                  :size="resize"
                  icon="mdi-link-variant"
                  variant="text"
                  :disabled="isLocalDeck"
                  @click="handleCopyDeckKey"
                  v-tooltip:bottom="'复制卡组代码'"
                ></v-btn>
                <v-btn
                  :size="resize"
                  icon="mdi-pencil"
                  variant="text"
                  @click="handleEditDeck"
                  v-tooltip:bottom="'编辑卡组'"
                ></v-btn>
                <v-btn
                  v-if="userRole !== 0 && !isLocalDeck"
                  :size="resize"
                  icon="mdi-history"
                  variant="text"
                  @click="isHistoryDialogVisible = true"
                  v-tooltip:bottom="'卡组历史'"
                ></v-btn>
              </template>
              <template v-if="!smAndUp">
                <v-btn
                  icon
                  :size="resize"
                  variant="text"
                  @click="showMoreActionsBottomSheet = true"
                >
                  <v-icon size="24">mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
            </div>

            <!-- 中間 -->
            <div class="header-center d-flex align-center">
              <div
                v-if="isViewingHistory && viewingHistoryIndex !== null"
                class="d-flex align-center justify-center flex-grow-1 text-truncate"
              >
                <h1
                  class="text-h6 text-sm-h5 text-truncate text-warning"
                  v-tooltip:bottom="history[viewingHistoryIndex - 1].text"
                >
                  检视变更: {{ history[viewingHistoryIndex - 1].text }}
                </h1>
                <v-btn small color="warning" variant="tonal" @click="exitHistoryView" class="ml-2"
                  >退出</v-btn
                >
              </div>
              <template v-else>
                <h1 v-if="deck" class="text-h6 text-sm-h5 text-truncate">
                  {{ deck.name }}
                </h1>
                <h1 v-else class="text-h6 text-sm-h5 text-truncate">N/A</h1>
              </template>
            </div>

            <!-- 右側 -->
            <div class="header-right mt-2">
              <template v-if="smAndUp">
                <v-tooltip
                  v-if="!isViewingHistory"
                  :text="showDifferences ? '隐藏差异' : '显示差异'"
                  location="bottom"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-if="isEditing && deckStore.editingDeckKey"
                      v-bind="props"
                      :size="resize"
                      :icon="
                        showDifferences ? 'mdi-vector-difference-ba' : 'mdi-vector-difference-ab'
                      "
                      variant="text"
                      @click="showDifferences = !showDifferences"
                    ></v-btn>
                  </template>
                </v-tooltip>
                <v-btn
                  :size="resize"
                  :icon="uiStore.showStatsDashboard ? 'mdi-chart-pie' : 'mdi-chart-pie-outline'"
                  class="mr-2"
                  variant="text"
                  @click="uiStore.showStatsDashboard = !uiStore.showStatsDashboard"
                  v-tooltip:bottom="uiStore.showStatsDashboard ? '隐藏统计' : '显示统计'"
                ></v-btn>
                <div style="width: 120px">
                  <v-select
                    v-model="groupBy"
                    :items="groupByOptions"
                    label="分类"
                    density="compact"
                    variant="outlined"
                    hide-details
                    :menu-props="uiStore.menuProps"
                  ></v-select>
                </div>
              </template>
              <template v-else>
                <v-btn icon :size="resize" variant="text" @click="showBottomSheet = true">
                  <v-icon size="24">mdi-format-list-bulleted-type</v-icon>
                </v-btn>
              </template>
            </div>
          </div>
        </div>

        <div
          class="h-100 overflow-y-auto themed-scrollbar"
          :style="{
            'paddingTop': `${headerOffsetHeight}px`,
            '--sb-margin-top': `${headerOffsetHeight - 18}px`,
          }"
          style="position: relative"
        >
          <!-- 只在資料準備好後才渲染 -->
          <DeckCardList
            v-if="isDataReady"
            :display-grouped-cards="displayGroupedCards"
            :stats-grouped-cards="statsGroupedCards"
            :group-by="groupBy"
            :selected-card="selectedCardData"
            :is-modal-visible="isModalVisible"
            :linked-cards="linkedCardsDetails"
            :is-loading-links="isLoadingLinkedCards"
            :selected-card-index="selectedCardIndex"
            :total-cards="flattenedDisplayCards.length"
            @card-click="handleCardClick"
            @update:isModalVisible="isModalVisible = $event"
            @show-new-card="handleShowNewCard"
            @prev-card="onPrevCard"
            @next-card="onNextCard"
          />
        </div>
      </div>
    </v-container>

    <div v-if="renderShareImage && deck">
      <DeckShareImage
        ref="deckShareImageRef"
        :deck-cards="cards"
        :deck-key="deckKey"
        :deck-name="deck.name"
        :mode="imageExportMode"
      />
    </div>

    <v-bottom-sheet v-model="showBottomSheet">
      <v-list :class="{ 'glass-sheet': hasBackgroundImage }" rounded="t-xl">
        <v-list-subheader>分类</v-list-subheader>
        <v-list-item
          v-for="option in groupByOptions"
          :key="option.value"
          :value="option.value"
          :active="groupBy === option.value"
          @click="selectGroupBy(option.value)"
        >
          <v-list-item-title>{{ option.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-bottom-sheet>

    <v-bottom-sheet v-model="showMoreActionsBottomSheet">
      <v-list :class="{ 'glass-sheet': hasBackgroundImage }" rounded="t-xl">
        <v-list-subheader>更多操作</v-list-subheader>
        <v-list-item @click="handleStatsDashboardClick">
          <template #prepend>
            <v-icon v-if="!uiStore.showStatsDashboard">mdi-chart-pie-outline</v-icon>
            <v-icon v-else>mdi-chart-pie</v-icon>
          </template>
          <v-list-item-title v-if="!uiStore.showStatsDashboard">显示统计</v-list-item-title>
          <v-list-item-title v-else>隐藏统计</v-list-item-title>
        </v-list-item>
        <v-list-item
          v-if="isEditing && deckStore.editingDeckKey && !isViewingHistory"
          @click="handleShowDifferencesClick"
        >
          <template #prepend>
            <v-icon v-if="!showDifferences">mdi-vector-difference-ab</v-icon>
            <v-icon v-else>mdi-vector-difference-ba</v-icon>
          </template>
          <v-list-item-title v-if="!showDifferences">显示差异</v-list-item-title>
          <v-list-item-title v-else>隐藏差异</v-list-item-title>
        </v-list-item>
        <v-list-item @click="handleEditDeck">
          <template #prepend>
            <v-icon>mdi-pencil</v-icon>
          </template>
          <v-list-item-title>编辑卡组</v-list-item-title>
        </v-list-item>
        <v-list-item v-if="userRole !== 0 && !isLocalDeck" @click="handleHistoryClick">
          <template #prepend>
            <v-icon>mdi-history</v-icon>
          </template>
          <v-list-item-title>卡组历史</v-list-item-title>
        </v-list-item>
        <v-list-item v-if="!isLocalDeck" @click="handleShareClick">
          <template #prepend>
            <v-icon>mdi-share-variant</v-icon>
          </template>
          <v-list-item-title>分享卡组</v-list-item-title>
        </v-list-item>
        <v-list-item v-if="!isLocalDeck" @click="handleCopyClick">
          <template #prepend>
            <v-icon>mdi-link-variant</v-icon>
          </template>
          <v-list-item-title>复制卡组代码</v-list-item-title>
        </v-list-item>
        <v-list-item @click="handleExportClick">
          <template #prepend>
            <v-icon>mdi-export-variant</v-icon>
          </template>
          <v-list-item-title>汇出卡组</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-bottom-sheet>

    <v-dialog v-model="isConfirmEditDialogVisible" max-width="420">
      <v-card>
        <template #prepend>
          <v-icon color="warning">mdi-alert-outline</v-icon>
          <v-card-title class="text-warning pl-2"> 确认编辑 </v-card-title>
        </template>

        <v-card-text>
          <p>检测到有尚未储存的卡组，若继续将会复盖。</p>
          <p>是否要舍弃目前的卡组，开始编辑新的卡组？</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text="取消" @click="isConfirmEditDialogVisible = false"></v-btn>
          <v-btn color="primary" variant="tonal" text="确定" @click="confirmAndEditDeck"></v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <DeckExportDialog
      v-model="exportDialog"
      :cards="cards"
      :deck-name="deck?.name || 'deck'"
      :generated-image-result="generatedImageResult"
      @generate-image="handleGenerateDeckImage"
      @download-pdf="handleDownloadDeckPDF"
    />

    <v-dialog v-model="isHistoryDialogVisible" max-width="650" scrollable>
      <v-card elevation="0" class="rounded-xl">
        <!-- 头部 -->
        <v-card-title class="px-6 py-5 d-flex align-center">
          <v-icon icon="mdi-history" size="24" class="mr-3 text-primary"></v-icon>
          <span class="text-h6">卡组历史纪录</span>
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="isHistoryDialogVisible = false"
          ></v-btn>
        </v-card-title>

        <v-divider></v-divider>

        <!-- 内容区域 -->
        <v-card-text class="pa-0 overflow-y-auto themed-scrollbar" style="max-height: 65vh">
          <v-list v-if="history.length > 0" class="py-2">
            <v-list-item
              v-for="(item, index) in history"
              :key="item.time"
              class="px-6 py-3 my-1"
              rounded="lg"
              elevation="0"
            >
              <template #prepend>
                <v-icon icon="mdi-card-text" size="20" class="text-medium-emphasis mr-3"></v-icon>
              </template>

              <v-list-item-title
                class="text-body-1 mb-2 cursor-pointer"
                @click="showTextModal(item.text)"
              >
                {{ item.text }}
              </v-list-item-title>

              <v-list-item-subtitle class="text-caption">
                {{
                  new Date(item.time).toLocaleString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }}
              </v-list-item-subtitle>

              <template #append>
                <v-btn
                  color="primary"
                  variant="text"
                  size="small"
                  @click="viewHistoryState(index + 1)"
                >
                  检视
                </v-btn>
              </template>
            </v-list-item>
          </v-list>

          <!-- 空状态 -->
          <div v-else class="text-center py-16">
            <v-icon icon="mdi-history" size="64" class="text-disabled mb-4"></v-icon>
            <p class="text-body-1 text-medium-emphasis">暂无历史纪录</p>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <!-- 底部 -->
        <v-card-actions class="px-6 py-4">
          <span v-if="history.length > 0" class="text-caption text-medium-emphasis">
            共 {{ history.length }} 条记录
          </span>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="isHistoryDialogVisible = false"> 关闭 </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="isTextModalVisible" max-width="500" class="overflow-y-auto themed-scrollbar">
      <v-card>
        <v-card-text>
          {{ modalTextContent }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="isTextModalVisible = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, ref, onUnmounted, onMounted, nextTick, watch, toRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeckEncoder } from '@/composables/useDeckEncoder'
import { useDisplay } from 'vuetify'
import { storeToRefs } from 'pinia'
import { useDeckGrouping } from '@/composables/useDeckGrouping'
import { getCardUrls } from '@/utils/getCardImage'
import { fetchCardByIdAndPrefix, fetchCardsByBaseIdAndPrefix } from '@/utils/card'
import { useSnackbar } from '@/composables/useSnackbar'
import { useUIStore } from '@/stores/ui'
import { useDeckStore } from '@/stores/deck'
import { useAuthStore } from '@/stores/auth'
import { useCardNavigation } from '@/composables/useCardNavigation.js'
import { sortCards } from '@/utils/cardsSort'
import { convertElementToPng } from '@/utils/domToImage.js'
import { convertDeckToPDF } from '@/utils/domToPDF'
import DeckShareImage from '@/components/deck/DeckShareImage.vue'
import DeckCardList from '@/components/deck/DeckCardList.vue'
import DeckExportDialog from '@/components/deck/DeckExportDialog.vue'
import * as clipboard from 'clipboard-polyfill'

const { smAndUp } = useDisplay()
const resize = computed(() => {
  return smAndUp.value ? 'default' : 'small'
})
const route = useRoute()
const router = useRouter()
const { decodeDeck } = useDeckEncoder()
const { triggerSnackbar } = useSnackbar()
const uiStore = useUIStore()
const authStore = useAuthStore()
const { userRole } = storeToRefs(authStore)
const deckStore = useDeckStore()

const deckKey = route.params.key
const isLocalDeck = computed(() => deckKey === 'local')
const deck = ref(null)
const cards = ref({})
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)
const isConfirmEditDialogVisible = ref(false)
const isTextModalVisible = ref(false)
const modalTextContent = ref('')
const renderShareImage = ref(false)

const isHistoryDialogVisible = ref(false)
const viewingHistoryIndex = ref(null)
const historicalCards = ref([])
const isViewingHistory = ref(false)
const history = computed(() => deck.value?.history || [])

const originalCards = ref([])
const editedCards = ref([])
const showDifferences = ref(true)
const isEditing = computed(() => {
  if (isLocalDeck.value) {
    return deckStore.editingDeckKey === null
  }
  return deckStore.editingDeckKey === deckKey
})

const isDataReady = ref(false)

const handleShareCard = async () => {
  if (!deckKey || isLocalDeck.value) {
    triggerSnackbar('无法生成分享链接', 'error')
    return
  }
  const shareUrl = `${window.location.origin}/share-decks/${deckKey}`
  try {
    await clipboard.writeText(shareUrl)
    triggerSnackbar('分享链接已复制', 'success')
  } catch (err) {
    console.error('Failed to copy: ', err)
    triggerSnackbar('复制失败', 'error')
  }
}

const handleCopyDeckKey = async () => {
  if (!deckKey || isLocalDeck.value) {
    triggerSnackbar('无法复制卡组代码', 'error')
    return
  }
  try {
    await clipboard.writeText(deckKey)
    triggerSnackbar('卡组代码已复制', 'success')
  } catch (err) {
    console.error('Failed to copy: ', err)
    triggerSnackbar('复制失败', 'error')
  }
}

const handleEditDeck = async () => {
  if (!deck.value) {
    triggerSnackbar('无法编辑卡组', 'error')
    return
  }

  // Check if there's an ongoing edit of a *different* deck
  const isEditingAnotherDeck =
    deckStore.totalCardCount > 0 &&
    !(deckStore.editingDeckKey === deckKey || (isLocalDeck.value && !deckStore.editingDeckKey))

  if (isEditingAnotherDeck) {
    isConfirmEditDialogVisible.value = true
    return
  }

  // If no conflict, or continuing the current edit, proceed.
  await startEditing()
}

const confirmAndEditDeck = async () => {
  isConfirmEditDialogVisible.value = false
  await startEditing(true) // Force start, overwriting previous edit
}

const startEditing = async (force = false) => {
  const isAlreadyEditingThis =
    deckStore.editingDeckKey === deckKey || (isLocalDeck.value && deckStore.editingDeckKey === null)

  // Only call setEditingDeck if we are starting a new session or forcing an overwrite
  if (!isAlreadyEditingThis || force) {
    const keyForEditing = isLocalDeck.value ? null : deckKey
    deckStore.setEditingDeck(deck.value, keyForEditing)
    if (isLocalDeck.value) deckStore.updateDominantSeriesId()

    await updateEditedCards()
  }

  // Navigate to the editor view
  router.push({ name: 'SeriesDetail', params: { seriesId: deckStore.seriesId } })
}

const updateEditedCards = async () => {
  if (isEditing.value && Object.keys(deckStore.cardsInDeck).length > 0) {
    const cardsArray = Object.values(deckStore.cardsInDeck)
    const fetchedCards = await Promise.all(
      cardsArray.map(async (card) => {
        const fullCardData = await fetchCardByIdAndPrefix(card.id, card.cardIdPrefix)
        if (!fullCardData) {
          console.warn(`Card data not found for id: ${card.id}, prefix: ${card.cardIdPrefix}`)
          return null
        }
        return { ...fullCardData, quantity: card.quantity }
      })
    )
    editedCards.value = fetchedCards.filter(Boolean)
  } else {
    editedCards.value = []
  }
}

onMounted(async () => {
  uiStore.setLoading(true)
  isDataReady.value = false

  try {
    let initialCards = {}
    if (isLocalDeck.value) {
      if (deckStore.totalCardCount > 0) {
        const localCards = Object.values(deckStore.cardsInDeck)
        deck.value = {
          name: '当前卡组',
          deckData: deckStore.cardsInDeck,
          coverCardId: deckStore.coverCardId || (localCards.length > 0 ? localCards[0].id : null),
          seriesId: deckStore.seriesId,
        }
        initialCards = deckStore.cardsInDeck
      } else {
        triggerSnackbar('当前卡组是空的', 'error')
        return
      }
    } else {
      deck.value = {
        ...deckStore.savedDecks[deckKey],
        deckData: await decodeDeck(toRaw(deckStore.savedDecks[deckKey].deckData)),
        history: await decodeDeck(toRaw(deckStore.savedDecks[deckKey].history)),
      }
      initialCards = deck.value.deckData
      console.log(deck.value)
    }

    cards.value = Object.values(initialCards).reduce((acc, card) => {
      const baseId = card.id.replace(/[A-Za-z]+$/, '')
      if (acc[card.id]) {
        acc[card.id].quantity += card.quantity
      } else {
        acc[card.id] = { ...card, baseId }
      }
      return acc
    }, {})

    // Process originalCards here after deck.value is set
    if (deck.value?.deckData) {
      const cardsArray = Object.values(deck.value.deckData)
      originalCards.value = await Promise.all(
        cardsArray.map(async (card) => {
          const fullCardData = await fetchCardByIdAndPrefix(card.id, card.cardIdPrefix)
          if (!fullCardData) {
            console.warn(`Card data not found for id: ${card.id}, prefix: ${card.cardIdPrefix}`)
            return null
          }
          return { ...fullCardData, quantity: card.quantity }
        })
      )
      // 過濾掉 null 值
      originalCards.value = originalCards.value.filter(Boolean)
    } else {
      originalCards.value = []
    }

    // 如果正在編輯，也要加載 editedCards
    await updateEditedCards()

    // 確保所有資料都準備好
    await nextTick()
    isDataReady.value = true
  } catch (error) {
    triggerSnackbar(error.message, 'error')
  } finally {
    uiStore.setLoading(false)
  }
})

const groupBy = ref('level')
const groupByOptions = [
  { title: '等级', value: 'level' },
  { title: '颜色', value: 'color' },
  { title: '种类', value: 'type' },
  { title: '产品', value: 'product_name' },
  { title: '费用', value: 'cost' },
]

const cardsForDisplay = computed(() => {
  // When NOT showing diffs, or when not editing, always show the remote deck.
  if (!isEditing.value || !showDifferences.value) {
    return originalCards.value.map((c) => ({ ...c, diffStatus: 'unchanged' }))
  }

  // WHEN SHOWING DIFFS:
  const originalCardMap = new Map(originalCards.value.map((c) => [c.id, c.quantity]))
  const editedCardMap = new Map(editedCards.value.map((c) => [c.id, c.quantity]))
  const allCardIds = new Set([...originalCardMap.keys(), ...editedCardMap.keys()])

  const cardInfoSource = {}
  originalCards.value.forEach((c) => (cardInfoSource[c.id] = c))
  editedCards.value.forEach((c) => {
    cardInfoSource[c.id] = { ...(cardInfoSource[c.id] || {}), ...c }
  })

  return Array.from(allCardIds)
    .map((id) => {
      const originalQty = originalCardMap.get(id) || 0
      const editedQty = editedCardMap.get(id) || 0
      const cardData = cardInfoSource[id]

      if (!cardData || (originalQty === 0 && editedQty === 0)) return null

      let diffStatus = 'unchanged'
      if (originalQty === 0 && editedQty > 0) {
        diffStatus = 'added'
      } else if (originalQty > 0 && editedQty === 0) {
        diffStatus = 'removed'
      } else if (originalQty !== editedQty) {
        diffStatus = editedQty > originalQty ? 'increased' : 'decreased'
      }

      return {
        ...cardData,
        quantity: editedQty,
        diffStatus,
      }
    })
    .filter(Boolean)
})

const cardsForStats = computed(() => {
  if (isViewingHistory.value) {
    return historicalCards.value.filter((c) => c.quantity > 0)
  }
  // When showing diffs, stats are for the EDITED deck.
  if (isEditing.value && showDifferences.value) {
    return editedCards.value.filter((c) => c.quantity > 0)
  }
  // Otherwise, stats are for the REMOTE deck.
  return originalCards.value.filter((c) => c.quantity > 0)
})

const cardsToDisplayOrGroup = computed(() => {
  if (isViewingHistory.value) {
    return historicalCards.value
  }
  return cardsForDisplay.value
})

const { groupedCards: displayGroupedCards } = useDeckGrouping(cardsToDisplayOrGroup, groupBy)
const { groupedCards: statsGroupedCards } = useDeckGrouping(cardsForStats, groupBy)

const flattenedDisplayCards = computed(() => {
  const cardGroups = Array.from(displayGroupedCards.value.values())
  return cardGroups.flat()
})

const headerRef = ref(null)
const headerOffsetHeight = ref(0)
let observer = null

onMounted(() => {
  if (headerRef.value) {
    observer = new ResizeObserver(([entry]) => {
      if (entry?.target) {
        headerOffsetHeight.value = entry.target.offsetHeight + 18
      }
    })
    observer.observe(headerRef.value)
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

const isModalVisible = ref(false)
const selectedCardData = ref(null)
const linkedCardsDetails = ref([])
const isLoadingLinkedCards = ref(false)

const { selectedCardIndex, getPrevCard, getNextCard } = useCardNavigation(
  flattenedDisplayCards,
  selectedCardData
)

const onPrevCard = () => {
  const prevCard = getPrevCard()
  if (prevCard) {
    handleShowNewCard({ card: prevCard })
  }
}

const onNextCard = () => {
  const nextCard = getNextCard()
  if (nextCard) {
    handleShowNewCard({ card: nextCard })
  }
}

const handleShowNewCard = async (cardPayload) => {
  try {
    const card = cardPayload.card || cardPayload
    if (!card) return

    linkedCardsDetails.value = []
    isLoadingLinkedCards.value = true
    selectedCardData.value = card
    isModalVisible.value = true

    if (card.link && Array.isArray(card.link) && card.link.length > 0) {
      const linkedCardsData = await Promise.all(
        card.link.map(async (linkId) => fetchCardsByBaseIdAndPrefix(linkId, card.cardIdPrefix))
      )
      if (selectedCardData.value && selectedCardData.value.id === card.id) {
        linkedCardsDetails.value = sortCards(linkedCardsData.flat().filter(Boolean))
      }
    }
  } catch (error) {
    console.error('Error handling show new card:', error)
  } finally {
    isLoadingLinkedCards.value = false
  }
}

const handleCardClick = async (item) => {
  await handleShowNewCard({ card: item })
}

const deckShareImageRef = ref(null)
const isGenerationTriggered = ref(false)
const exportDialog = ref(false)
const imageExportMode = ref('u_climax')
const generatedImageResult = ref(null)

const openExportDialog = () => {
  if (!deck.value) {
    triggerSnackbar('无法导出，卡组数据缺失。', 'error')
    return
  }
  generatedImageResult.value = null
  exportDialog.value = true
}

const handleGenerateDeckImage = async (mode = 'u_climax') => {
  if (!deck.value) {
    triggerSnackbar('无法生成图片，卡组数据缺失。', 'error')
    return
  }
  generatedImageResult.value = null
  imageExportMode.value = mode

  uiStore.setLoading(true)
  renderShareImage.value = true
  await nextTick()
  isGenerationTriggered.value = true
}

watch(
  [isGenerationTriggered, () => deckShareImageRef.value?.allImagesLoaded],
  async ([triggered, loaded]) => {
    if (triggered && loaded && deckShareImageRef.value) {
      const imageRef = deckShareImageRef.value
      try {
        isGenerationTriggered.value = false

        if (imageRef) {
          imageRef.toggleQrCode(!isLocalDeck.value)
          await nextTick()
        }

        await new Promise((resolve) => setTimeout(resolve, 300))

        const result = await convertElementToPng(
          'deck-share-image-content',
          deck.value.name.trim(),
          2,
          false,
          false
        )
        generatedImageResult.value = result
      } catch (error) {
        console.error('生成图片失败:', error)
        triggerSnackbar('生成图片失败，请稍后再试。', 'error')
      } finally {
        if (imageRef) {
          imageRef.toggleQrCode(!isLocalDeck.value)
        }
        uiStore.setLoading(false)
        renderShareImage.value = false
      }
    } else if (triggered && !loaded) {
      console.log('Waiting for images to load...')
    }
  },
  {
    immediate: false,
  }
)

const handleDownloadDeckPDF = async (language) => {
  uiStore.setLoading(true)
  try {
    const cardsWithImages = originalCards.value.map((card) => {
      const { base } = getCardUrls(card.cardIdPrefix, card.id)
      return {
        ...card,
        imgUrl: base,
      }
    })

    await convertDeckToPDF(cardsWithImages, deck.value.name, language)
  } catch (error) {
    console.error('生成PDF失败:', error)
    triggerSnackbar('生成PDF失败，请稍后再试。', 'error')
  } finally {
    uiStore.setLoading(false)
  }
}

const showBottomSheet = ref(false)
const selectGroupBy = (value) => {
  groupBy.value = value
  showBottomSheet.value = false
}

const showMoreActionsBottomSheet = ref(false)
const handleStatsDashboardClick = () => {
  uiStore.showStatsDashboard = !uiStore.showStatsDashboard
  showMoreActionsBottomSheet.value = false
}
const handleShowDifferencesClick = () => {
  showDifferences.value = !showDifferences.value
  showMoreActionsBottomSheet.value = false
}
const handleExportClick = () => {
  openExportDialog()
  showMoreActionsBottomSheet.value = false
}
const handleShareClick = () => {
  handleShareCard()
  showMoreActionsBottomSheet.value = false
}
const handleCopyClick = () => {
  handleCopyDeckKey()
  showMoreActionsBottomSheet.value = false
}

const viewHistoryState = async (index) => {
  uiStore.setLoading(true)
  try {
    const historyIndex = index - 1
    const targetHistoryEntry = history.value[historyIndex]
    if (!targetHistoryEntry) return

    viewingHistoryIndex.value = index
    isViewingHistory.value = true
    isHistoryDialogVisible.value = false

    // Step 1: Calculate the full deck state at that point in time by reverting changes.
    // The history is newest first (index 0), so we revert changes from 0 to historyIndex - 1.
    const cardMap = new Map(JSON.parse(JSON.stringify(originalCards.value)).map((c) => [c.id, c]))

    for (let i = 0; i < historyIndex; i++) {
      const entry = history.value[i]
      if (!entry.diff) continue

      for (const change of entry.diff) {
        const cardId = change.cardId
        const card = cardMap.get(cardId)
        const prefix = change.cardId.split('/')[0].toLowerCase()

        switch (change.status) {
          case 'added': // Revert an add = remove
            if (card) {
              card.quantity -= change.quantity
              if (card.quantity <= 0) {
                cardMap.delete(cardId)
              }
            }
            break
          case 'removed': // Revert a remove = add back
            // eslint-disable-next-line no-case-declarations
            const fullCardData = await fetchCardByIdAndPrefix(cardId, prefix)
            if (fullCardData) {
              if (card) {
                card.quantity += change.quantity
              } else {
                cardMap.set(cardId, { ...fullCardData, quantity: change.quantity })
              }
            }
            break
          case 'modified': // Revert a modification = set back to 'from'
            if (card) {
              card.quantity = change.from
            }
            break
        }
      }
    }
    // Now `cardMap` holds the complete deck state right AFTER the target change.

    // Step 2: Apply diffStatus to the calculated state based on the target change.
    const targetDiffMap = new Map((targetHistoryEntry.diff || []).map((d) => [d.cardId, d]))

    const finalCards = Array.from(cardMap.values()).map((card) => {
      const change = targetDiffMap.get(card.id)
      if (change) {
        let diffStatus = change.status
        if (change.status === 'modified') {
          diffStatus = change.to > change.from ? 'increased' : 'decreased'
        }
        return { ...card, diffStatus }
      } else {
        return { ...card, diffStatus: 'unchanged' }
      }
    })

    // Step 3: Add back any cards that were 'removed' in this specific change, so they appear in the list.
    for (const change of targetHistoryEntry.diff || []) {
      if (change.status === 'removed') {
        const fullCardData = await fetchCardByIdAndPrefix(change.cardId, deck.value.seriesId)
        if (fullCardData) {
          finalCards.push({
            ...fullCardData,
            quantity: 0, // Show quantity as 0 as it was removed.
            diffStatus: 'removed',
          })
        }
      }
    }

    historicalCards.value = finalCards
  } catch (error) {
    triggerSnackbar('加载历史记录失败', 'error')
    console.error(error)
    exitHistoryView() // Reset state on error
  } finally {
    uiStore.setLoading(false)
  }
}

const exitHistoryView = () => {
  isViewingHistory.value = false
  viewingHistoryIndex.value = null
  historicalCards.value = []
}

const handleHistoryClick = () => {
  isHistoryDialogVisible.value = true
  showMoreActionsBottomSheet.value = false
}

const showTextModal = (text) => {
  modalTextContent.value = text
  isTextModalVisible.value = true
}
</script>

<style scoped></style>
