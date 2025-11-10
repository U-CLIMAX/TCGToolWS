<template>
  <div class="h-100">
    <v-container fluid class="h-100 pa-0">
      <div class="d-flex flex-column h-100 overflow-hidden">
        <div ref="headerRef" class="overlay-header pl-4 pr-4 pa-1">
          <div class="overlay-header-content">
            <!-- 左側 -->
            <div class="header-left">
              <template v-if="smAndUp">
                <v-tooltip text="汇出卡组" location="bottom">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      :size="resize"
                      icon="mdi-export-variant"
                      variant="text"
                      @click="openExportDialog"
                    ></v-btn>
                  </template>
                </v-tooltip>
                <v-tooltip text="分享卡组" location="bottom">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      :size="resize"
                      icon="mdi-share-variant"
                      variant="text"
                      :disabled="isLocalDeck"
                      @click="handleShareCard"
                    ></v-btn>
                  </template>
                </v-tooltip>
                <v-tooltip text="复制卡组代码" location="bottom">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      :size="resize"
                      icon="mdi-link-variant"
                      variant="text"
                      :disabled="isLocalDeck"
                      @click="handleCopyDeckKey"
                    ></v-btn>
                  </template>
                </v-tooltip>
                <v-tooltip text="编辑卡组" location="bottom">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      :size="resize"
                      icon="mdi-pencil"
                      variant="text"
                      @click="handleEditDeck"
                    ></v-btn>
                  </template>
                </v-tooltip>
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
              <h1 v-if="deck" class="text-h6 text-sm-h5 text-truncate">
                {{ deck.name }}
              </h1>
              <h1 v-else class="text-h6 text-sm-h5 text-truncate">N/A</h1>
            </div>

            <!-- 右側 -->
            <div class="header-right mt-2">
              <template v-if="smAndUp">
                <v-tooltip :text="showDifferences ? '隐藏差异' : '显示差异'" location="bottom">
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
                <v-tooltip
                  :text="uiStore.showStatsDashboard ? '隐藏统计' : '显示统计'"
                  location="bottom"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      :size="resize"
                      :icon="uiStore.showStatsDashboard ? 'mdi-chart-pie' : 'mdi-chart-pie-outline'"
                      class="mr-2"
                      variant="text"
                      @click="uiStore.showStatsDashboard = !uiStore.showStatsDashboard"
                    ></v-btn>
                  </template>
                </v-tooltip>
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
          :style="{ paddingTop: `${headerOffsetHeight}px` }"
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

    <DeckShareImage
      ref="deckShareImageRef"
      v-if="deck"
      :deck-cards="cards"
      :deck-key="deckKey"
      :deck-name="deck.name"
    />

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
          v-if="isEditing && deckStore.editingDeckKey"
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
          <v-btn color="primary" variant="flat" text="确认" @click="confirmAndEditDeck"></v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <DeckExportDialog
      v-model="exportDialog"
      :cards="cards"
      @download-image="handleDownloadDeckImage"
      @download-pdf="handleDownloadDeckPDF"
    />
  </div>
</template>

<script setup>
import { computed, ref, onUnmounted, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeckEncoder } from '@/composables/useDeckEncoder'
import { useDisplay } from 'vuetify'
import { useDeckGrouping } from '@/composables/useDeckGrouping'
import { useCardImage } from '@/composables/useCardImage'
import { fetchCardByIdAndPrefix, fetchCardsByBaseIdAndPrefix } from '@/utils/card'
import { useSnackbar } from '@/composables/useSnackbar'
import { useUIStore } from '@/stores/ui'
import { useDeckStore } from '@/stores/deck'
import { useCardNavigation } from '@/composables/useCardNavigation.js'
import collator from '@/utils/collator.js'
import { convertElementToPng } from '@/utils/domToImage.js'
import { convertDeckToPDF } from '@/utils/domToPDF'
import DeckShareImage from '@/components/deck/DeckShareImage.vue'
import DeckCardList from '@/components/deck/DeckCardList.vue'
import DeckExportDialog from '@/components/deck/DeckExportDialog.vue'

const { smAndUp } = useDisplay()
const resize = computed(() => {
  return smAndUp.value ? 'default' : 'small'
})
const route = useRoute()
const router = useRouter()
const { decodeDeck } = useDeckEncoder()
const { triggerSnackbar } = useSnackbar()
const uiStore = useUIStore()
const deckStore = useDeckStore()

const deckKey = route.params.key
const isLocalDeck = computed(() => deckKey === 'local')
const deck = ref(null)
const cards = ref({})
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)
const isConfirmEditDialogVisible = ref(false)

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
    await navigator.clipboard.writeText(shareUrl)
    triggerSnackbar('分享链接已复制到剪贴板', 'success')
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
    await navigator.clipboard.writeText(deckKey)
    triggerSnackbar('卡组代码已复制到剪贴板', 'success')
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
          cards: deckStore.cardsInDeck,
          coverCardId: deckStore.coverCardId || (localCards.length > 0 ? localCards[0].id : null),
          seriesId: deckStore.seriesId,
        }
        initialCards = deckStore.cardsInDeck
      } else {
        triggerSnackbar('当前卡组是空的', 'error')
        return
      }
    } else {
      const decoded = await decodeDeck(deckKey)
      deck.value = decoded
      initialCards = decoded.cards
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
    if (deck.value?.cards) {
      const cardsArray = Object.values(deck.value.cards)
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
  // When showing diffs, stats are for the EDITED deck.
  if (isEditing.value && showDifferences.value) {
    return editedCards.value.filter((c) => c.quantity > 0)
  }
  // Otherwise, stats are for the REMOTE deck.
  return originalCards.value.filter((c) => c.quantity > 0)
})

const { groupedCards: displayGroupedCards } = useDeckGrouping(cardsForDisplay, groupBy)
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

    if (card.link && Array.isArray(card.link) && card.link.length > 0) {
      const baseIds = [...new Set(card.link.map((linkId) => linkId.replace(/[a-zA-Z]+$/, '')))]
      const fetchedLinks = await Promise.all(
        baseIds.map(async (baseId) => await fetchCardsByBaseIdAndPrefix(baseId, card.cardIdPrefix))
      )
      linkedCardsDetails.value = fetchedLinks
        .flat()
        .filter(Boolean)
        .sort((a, b) => collator.compare(a.name, b.name))
    } else {
      linkedCardsDetails.value = []
    }
    selectedCardData.value = card
    isModalVisible.value = true
  } catch (error) {
    console.error('Error handling show new card:', error)
  }
}

const handleCardClick = async (item) => {
  await handleShowNewCard({ card: item })
}

const deckShareImageRef = ref(null)
const isGenerationTriggered = ref(false)
const exportDialog = ref(false)

const openExportDialog = () => {
  if (!deck.value) {
    triggerSnackbar('无法导出，卡组数据缺失。', 'error')
    return
  }
  exportDialog.value = true
}

const handleDownloadDeckImage = () => {
  if (!deck.value) {
    triggerSnackbar('无法生成图片，卡组数据缺失。', 'error')
    return
  }
  // 立即启动加载状态，给用户即时反馈
  uiStore.setLoading(true)
  isGenerationTriggered.value = true
}

watch(
  [isGenerationTriggered, () => deckShareImageRef.value?.allImagesLoaded],
  async ([triggered, loaded]) => {
    if (triggered && loaded) {
      const imageRef = deckShareImageRef.value
      try {
        isGenerationTriggered.value = false

        if (imageRef) {
          imageRef.toggleQrCode(!isLocalDeck.value)
          await nextTick()
        }

        await new Promise((resolve) => setTimeout(resolve, 300))

        await convertElementToPng('deck-share-image-content', deck.value.name.trim(), 2)
      } catch (error) {
        console.error('生成图片失败:', error)
        triggerSnackbar('生成图片失败，请稍后再试。', 'error')
      } finally {
        if (imageRef) {
          imageRef.toggleQrCode(!isLocalDeck.value)
        }
        uiStore.setLoading(false)
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
      const imgUrl = useCardImage(card.cardIdPrefix, card.id)
      return {
        ...card,
        imgUrl: imgUrl.value,
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
</script>

<style scoped>
.card-container {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.card-container:hover {
  transform: translateY(-5px);
}

.image-container {
  position: relative;
  border: 2px solid transparent;
  border-radius: 6px;
  transition: border-color 0.2s ease-in-out;
}

.quantity-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgb(var(--v-theme-primary));
  color: white;
  border-radius: 12px;
  padding: 0 6px;
  font-size: 0.8rem;
  font-weight: bold;
  border: 2px solid white;
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.centered-content {
  margin: 0 auto;
  max-width: 1200px;
}

@media (max-width: 1200px) {
  .centered-content {
    max-width: 100%;
  }
}
</style>
