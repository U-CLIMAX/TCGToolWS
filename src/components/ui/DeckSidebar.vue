<template>
  <aside
    v-bind="$attrs"
    class="d-flex flex-column flex-shrink-0"
    :style="{
      paddingTop: `${smAndUp ? headerOffsetHeight + 18 : 0}px`,
      height: containerHeight ? `${containerHeight}px` : 'auto',
    }"
  >
    <v-sheet
      :rounded="smAndUp ? '3md' : false"
      class="pa-4 ga-4 d-flex flex-column fill-height overflow-hidden"
      :class="{ 'glass-sheet': hasBackgroundImage && !transparent }"
      :color="transparent ? 'transparent' : undefined"
    >
      <div class="d-flex justify-space-between align-center">
        <div class="d-flex align-center ga-2">
          <v-btn
            :icon="clearButtonIcon"
            variant="text"
            color="error"
            density="compact"
            :disabled="deckStore.totalCardCount === 0"
            @click="openClearConfirmDialog"
          >
          </v-btn>
          <h2 class="text-h6">当前卡组</h2>
          <v-chip pill size="small" :color="deckStore.totalCardCount > 50 ? 'warning' : undefined">
            <v-icon start icon="mdi-cards-diamond-outline"></v-icon>
            {{ deckStore.totalCardCount }} / 50
          </v-chip>
          <v-tooltip text="前往卡组页面" location="top center">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                :disabled="deckStore.totalCardCount <= 0"
                icon="mdi-open-in-new"
                variant="text"
                color="teal-lighten-1"
                density="compact"
                @click="navigateToDeckDetail"
              ></v-btn>
            </template>
          </v-tooltip>
        </div>
        <v-btn
          icon="mdi-content-save-outline"
          variant="text"
          color="primary"
          density="compact"
          :disabled="deckStore.totalCardCount === 0 || deckStore.totalCardCount > 50"
          @click="openSaveDialog"
        >
        </v-btn>
      </div>

      <v-row dense>
        <v-col cols="7" sm="8" class="pa-0">
          <v-btn-toggle
            v-model="activeMode"
            density="compact"
            color="primary"
            variant="tonal"
            divided
            mandatory
            class="w-100 h-100"
          >
            <v-btn value="remove" class="flex-1-1" style="min-width: 0">
              <v-icon icon="mdi-minus"></v-icon>
            </v-btn>
            <v-btn value="none" class="flex-1-1" style="min-width: 0">
              <v-icon icon="mdi-cursor-default-click-outline"></v-icon>
            </v-btn>
            <v-btn
              value="add"
              class="flex-1-1"
              style="min-width: 0"
              :disabled="deckStore.totalCardCount >= 50 && userRole === 0"
            >
              <v-icon icon="mdi-plus"></v-icon>
            </v-btn>
          </v-btn-toggle>
        </v-col>
        <v-col cols="5" sm="4" class="pa-0 pl-2">
          <v-select
            v-model="groupBy"
            :items="groupByOptions"
            label="分类"
            density="compact"
            variant="outlined"
            hide-details
            :menu-props="uiStore.menuProps"
          ></v-select>
        </v-col>
      </v-row>

      <v-divider></v-divider>

      <div class="fill-height overflow-y-auto overflow-x-hidden themed-scrollbar pl-4 pr-4">
        <div
          v-if="Object.keys(deckStore.cardsInDeck).length === 0"
          class="text-center text-disabled mt-8"
        >
          <v-icon size="48" icon="mdi-cards-outline"></v-icon>
          <p class="mt-2">尚未加入卡片</p>
        </div>

        <div v-else>
          <div v-for="([groupName, group], index) in groupedCards" :key="groupName">
            <div
              class="d-flex justify-space-between align-center text-subtitle-2 text-disabled mb-1"
              :class="{ 'mt-3': index > 0 }"
            >
              <span>{{ getGroupName(groupName) }}</span>
              <v-chip size="small" variant="tonal" color="secondary" label>
                {{ group.reduce((sum, item) => sum + item.quantity, 0) }}
              </v-chip>
            </div>
            <v-row dense>
              <v-col v-for="item in group" :key="item.id" cols="4" lg="3">
                <div class="card-container" @click="handleCardClick(item)">
                  <div class="image-container">
                    <v-img
                      :src="useCardImage(item.cardIdPrefix, item.id).value"
                      :aspect-ratio="400 / 559"
                      cover
                      class="rounded"
                      lazy-src="/empty-placehold.webp"
                    >
                      <template #placeholder>
                        <div class="d-flex align-center justify-center fill-height">
                          <v-progress-circular
                            color="grey-lighten-4"
                            indeterminate
                          ></v-progress-circular>
                        </div>
                      </template>
                      <template #error>
                        <v-img
                          src="/placehold.webp"
                          :aspect-ratio="400 / 559"
                          cover
                          class="rounded"
                        />
                      </template>
                    </v-img>
                    <div class="quantity-badge">{{ item.quantity }}</div>
                  </div>
                </div>
              </v-col>
            </v-row>
          </div>
        </div>
      </div>
    </v-sheet>
  </aside>

  <!-- Card Detail Modal -->
  <v-dialog
    v-if="selectedCardData"
    v-model="isModalVisible"
    :fullscreen="xs"
    :max-width="smAndDown ? undefined : '60%'"
    :max-height="smAndDown ? undefined : '95%'"
    :min-height="smAndDown ? undefined : '60%'"
  >
    <CardDetailModal
      :card="selectedCardData"
      :imgUrl="modalCardImageUrl"
      :linkedCards="linkedCardsDetails"
      :showActions="true"
      :card-index="selectedCardIndex"
      :total-cards="deckCards.length"
      @close="isModalVisible = false"
      @show-new-card="handleShowNewCard"
      @prev-card="onPrevCard"
      @next-card="onNextCard"
    />
  </v-dialog>

  <!-- Auth Alert Dialog -->
  <v-dialog v-model="isAuthAlertOpen" max-width="400px">
    <v-card>
      <v-card-title> 需要登入</v-card-title>
      <v-card-text> 储存卡组功能需要登入后才能使用。 </v-card-text>
      <v-card-actions>
        <v-btn color="primary" text @click="isAuthAlertOpen = false">确定</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Save Deck Dialog -->
  <v-dialog v-model="isSaveDialogOpen" max-width="500px" @update:model-value="closeSaveDialog">
    <v-card>
      <v-card-title>{{ deckStore.editingDeckKey ? '更新卡组' : '储存卡组' }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="deckName"
          label="卡组名称"
          :counter="10"
          maxlength="10"
          variant="outlined"
          density="compact"
          hide-details="auto"
          class="mb-4"
        ></v-text-field>
        <p class="text-subtitle-1 mb-2">选择封面</p>
        <v-sheet
          class="overflow-y-auto pa-2 rounded themed-scrollbar"
          max-height="300px"
          :color="$vuetify.theme.current.dark ? 'grey-darken-3' : 'grey-lighten-3'"
        >
          <v-row dense>
            <v-col v-for="card in deckCards" :key="card.id" cols="4" lg="3">
              <div class="cover-card-container" @click="selectedCoverCardId = card.id">
                <v-img
                  :src="useCardImage(card.cardIdPrefix, card.id).value"
                  :aspect-ratio="400 / 559"
                  cover
                  class="rounded-lg"
                  lazy-src="/empty-placehold.webp"
                  :class="{ 'selected-cover': selectedCoverCardId === card.id, 'clickable': true }"
                >
                  <template #placeholder>
                    <div class="d-flex align-center justify-center fill-height">
                      <v-progress-circular
                        color="grey-lighten-4"
                        indeterminate
                      ></v-progress-circular>
                    </div>
                  </template>
                  <template #error>
                    <v-img
                      src="/placehold.webp"
                      :aspect-ratio="400 / 559"
                      cover
                      class="rounded-lg"
                    />
                  </template>
                </v-img>
              </div>
            </v-col>
          </v-row>
        </v-sheet>
      </v-card-text>
      <v-card-actions>
        <v-btn text @click="isSaveDialogOpen = false">取消</v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="tonal"
          @click="handleCreateDeck"
          :disabled="!deckName.trim() || !selectedCoverCardId"
          >建立新卡组
        </v-btn>
        <v-btn
          v-if="deckStore.editingDeckKey"
          color="secondary"
          variant="tonal"
          @click="promptForHistoryAndUpdate"
          :disabled="!deckName.trim() || !selectedCoverCardId"
          >更新卡组
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- History Note Dialog -->
  <v-dialog v-model="isHistoryDialogOpen" max-width="400px" persistent>
    <v-card>
      <v-card-title>新增更新纪录</v-card-title>
      <v-card-text>
        <v-form ref="historyForm" @submit.prevent="handleUpdateDeckWithHistory">
          <v-text-field
            v-model="historyText"
            label="本次更新摘要"
            :counter="20"
            :rules="[
              (v) => !!v || '必须填写摘要',
              (v) => (v && v.length <= 20) || '摘要不能超过20个字',
            ]"
            maxlength="20"
            variant="outlined"
            density="compact"
            autofocus
          ></v-text-field>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn text @click="isHistoryDialogOpen = false">取消</v-btn>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="tonal" @click="handleUpdateDeckWithHistory">确定更新</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Clear Confirm Dialog -->
  <v-dialog v-model="isClearConfirmDialogOpen" max-width="400">
    <v-card>
      <template #prepend>
        <v-icon color="warning">mdi-alert-outline</v-icon>
        <v-card-title class="text-warning pl-2"> {{ clearDialogTitle }} </v-card-title>
      </template>
      <v-card-text>{{ clearDialogContent }}</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text="取消" @click="isClearConfirmDialogOpen = false"></v-btn>
        <v-btn color="primary" variant="flat" text="确定" @click="confirmClearAction"></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, toRaw, onMounted } from 'vue'
import { useDeckStore } from '@/stores/deck'
import { useCardImage } from '@/composables/useCardImage'
import { fetchCardByIdAndPrefix, fetchCardsByBaseIdAndPrefix } from '@/utils/card'
import CardDetailModal from '@/components/card/CardDetailModal.vue'
import { useDisplay } from 'vuetify'
import { useDeckGrouping } from '@/composables/useDeckGrouping'
import { useDeckEncoder } from '@/composables/useDeckEncoder'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useSnackbar } from '@/composables/useSnackbar'
import { useUIStore } from '@/stores/ui'
import { useCardNavigation } from '@/composables/useCardNavigation.js'
import collator from '@/utils/collator.js'
import { getUserRole } from '@/composables/useUserRole'

defineProps({
  headerOffsetHeight: {
    type: Number,
    required: true,
  },
  containerHeight: {
    type: Number,
    default: null,
  },
  transparent: {
    type: Boolean,
    default: false,
  },
})

const router = useRouter()
const { xs, smAndUp, smAndDown } = useDisplay()
const deckStore = useDeckStore()
const { encodeDeck } = useDeckEncoder()
const { triggerSnackbar } = useSnackbar()
const uiStore = useUIStore()
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

// Loading State
const authStore = useAuthStore()
const userRole = ref(0)

onMounted(async () => {
  userRole.value = await getUserRole()
})

// Auth Alert Dialog State
const isAuthAlertOpen = ref(false)

// Save Deck Dialog State
const isSaveDialogOpen = ref(false)
const deckName = ref('')
const selectedCoverCardId = ref(null)

// History Dialog State
const isHistoryDialogOpen = ref(false)
const historyText = ref('')
const historyForm = ref(null)

const isClearConfirmDialogOpen = ref(false)

const clearButtonIcon = computed(() => {
  return deckStore.editingDeckKey ? 'mdi-exit-run' : 'mdi-delete-sweep-outline'
})

const clearDialogTitle = computed(() => {
  return deckStore.editingDeckKey ? '退出编辑' : '清除卡组'
})

const clearDialogContent = computed(() => {
  return deckStore.editingDeckKey
    ? '确定要退出编辑吗？未储存的内容将丢失。'
    : '确定要清除卡组内容吗？将会清除目前编辑的所有资讯。'
})

const flattenedDisplayCards = computed(() => {
  const cardGroups = Array.from(groupedCards.value.values())
  return cardGroups.flat()
})

const openSaveDialog = () => {
  if (!authStore.isAuthenticated) {
    isAuthAlertOpen.value = true
  } else if (deckCards.value.length > 0) {
    if (deckStore.editingDeckKey) {
      deckName.value = deckStore.deckName
      selectedCoverCardId.value = deckStore.coverCardId
    } else {
      selectedCoverCardId.value = deckCards.value[0].id
    }
    isSaveDialogOpen.value = true
  }
}

const closeSaveDialog = (value) => {
  if (!value) {
    // Reset state when dialog is closed
    isSaveDialogOpen.value = false
    if (!deckStore.editingDeckKey) {
      deckName.value = ''
      selectedCoverCardId.value = null
    }
  }
}

const openClearConfirmDialog = () => {
  isClearConfirmDialogOpen.value = true
}

const confirmClearAction = () => {
  deckStore.clearDeck()
  deckStore.clearEditingDeck()
  isClearConfirmDialogOpen.value = false
}

const navigateToDeckDetail = () => {
  if (deckStore.editingDeckKey) {
    router.push({ name: 'DeckDetail', params: { key: deckStore.editingDeckKey } })
  } else if (deckStore.totalCardCount > 0) {
    router.push({ name: 'DeckDetail', params: { key: 'local' } })
  }
}

const handleCreateDeck = async () => {
  deckStore.updateDominantSeriesId()
  uiStore.setLoading(true)
  try {
    const deckData = {
      name: deckName.value,
      version: deckStore.version,
      cards: toRaw(deckStore.cardsInDeck),
      seriesId: deckStore.seriesId,
      coverCardId: selectedCoverCardId.value,
    }
    const { key } = await encodeDeck(deckData, { isSharedDeck: false })

    isSaveDialogOpen.value = false
    triggerSnackbar('新卡组已成功创建！', 'success')
    await router.push(`/decks/${key}`)
    deckStore.clearEditingDeck()
    deckStore.clearDeck()
  } catch (error) {
    triggerSnackbar(error.message, 'error')
    console.error('❌ 創建失敗:', error)
  } finally {
    uiStore.setLoading(false)
  }
}

const calculateDiff = (originalCards, currentCards) => {
  const diff = []
  const allCardIds = new Set([...Object.keys(originalCards), ...Object.keys(currentCards)])

  allCardIds.forEach((cardId) => {
    const originalCard = originalCards[cardId]
    const currentCard = currentCards[cardId]

    if (!originalCard && currentCard) {
      // Added
      diff.push({ cardId, status: 'added', quantity: currentCard.quantity })
    } else if (originalCard && !currentCard) {
      // Removed
      diff.push({ cardId, status: 'removed', quantity: originalCard.quantity })
    } else if (originalCard && currentCard && originalCard.quantity !== currentCard.quantity) {
      // Modified
      diff.push({
        cardId,
        status: 'modified',
        from: originalCard.quantity,
        to: currentCard.quantity,
      })
    }
  })

  return diff
}

const userStatusForUpdate = ref(null)
const diffForUpdate = ref(null)

const promptForHistoryAndUpdate = async () => {
  userStatusForUpdate.value = await authStore.getUserStatus()
  const diff = calculateDiff(deckStore.originalCardsInDeck, deckStore.cardsInDeck)
  diffForUpdate.value = diff

  // Only prompt for history if there are actual card changes and user has the right role
  if (diff.length > 0 && userStatusForUpdate.value && userStatusForUpdate.value.role !== 0) {
    const editCount = (deckStore.deckHistory || []).length + 1
    historyText.value = `${deckName.value} #${editCount}`
    isHistoryDialogOpen.value = true
  } else {
    // If no diff or user is role 0, update directly
    await handleUpdateDeck('', diff)
  }
}

const handleUpdateDeckWithHistory = async () => {
  const { valid } = await historyForm.value.validate()
  if (valid) {
    // Use the stored diff instead of recalculating
    await handleUpdateDeck(historyText.value, toRaw(diffForUpdate.value))
    isHistoryDialogOpen.value = false
  }
}

const handleUpdateDeck = async (historyText = '', diff = []) => {
  if (!deckStore.editingDeckKey) {
    triggerSnackbar('缺少卡组标识，无法更新', 'error')
    return
  }
  deckStore.updateDominantSeriesId()
  uiStore.setLoading(true)

  try {
    let updatedHistory = toRaw(deckStore.deckHistory) || []
    const role = userStatusForUpdate.value?.role

    // Only users with role !== 0 can add a new history entry
    if (role !== 0 && diff.length > 0) {
      const newHistoryEntry = {
        time: Date.now(),
        text: historyText,
        diff: diff,
      }
      updatedHistory = [newHistoryEntry, ...updatedHistory]
      if (updatedHistory.length > 10) {
        updatedHistory.pop()
      }
    }

    const deckData = {
      name: deckName.value,
      version: deckStore.version,
      cards: toRaw(deckStore.cardsInDeck),
      seriesId: deckStore.seriesId,
      coverCardId: selectedCoverCardId.value,
      history: updatedHistory,
    }

    const { key } = await encodeDeck(deckData, { existingKey: deckStore.editingDeckKey })

    isSaveDialogOpen.value = false
    triggerSnackbar('卡组已成功更新！', 'success')
    await router.push(`/decks/${key}`)
    deckStore.clearEditingDeck()
    deckStore.clearDeck()
  } catch (error) {
    triggerSnackbar(error.message, 'error')
  } finally {
    uiStore.setLoading(false)
  }
}

const groupBy = ref('level')
const groupByOptions = [
  { title: '等级', value: 'level' },
  { title: '颜色', value: 'color' },
  { title: '种类', value: 'type' },
  { title: '产品', value: 'product_name' },
  { title: '费用', value: 'cost' },
]

const deckCards = computed(() => Object.values(deckStore.cardsInDeck))
const { groupedCards } = useDeckGrouping(deckCards, groupBy)

const colorMap = {
  red: '红色',
  blue: '蓝色',
  yellow: '黄色',
  green: '绿色',
}

const getGroupName = (groupName) => {
  switch (groupBy.value) {
    case 'level':
      return groupName === 'CX' ? '高潮卡' : `等级 ${groupName}`
    case 'color':
      return colorMap[groupName.toLowerCase()] || groupName
    case 'cost':
      return `费用 ${groupName}`
    default:
      return groupName
  }
}

// UI State
const activeMode = ref('none') // 'add', 'remove', 'none'
const isModalVisible = ref(false)

// Card Data for Modal
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

const modalCardImageUrl = computed(() => {
  if (selectedCardData.value) {
    return useCardImage(selectedCardData.value.cardIdPrefix, selectedCardData.value.id).value
  }
  return ''
})

/**
 * Handles displaying a new card in the CardDetailModal.
 * Fetches card details and linked cards based on the provided payload.
 * The payload can either be the card object directly (from initial click) or an object containing a 'card' property (from CardDetailModal emit).
 * @param {object|{card: object, imgUrl: string}} cardPayload - The payload containing card information.
 */
const handleShowNewCard = async (cardPayload) => {
  try {
    const cardToDisplay = cardPayload.card || cardPayload
    const card = await fetchCardByIdAndPrefix(cardToDisplay.id, cardToDisplay.cardIdPrefix)
    if (!card) {
      console.error('Failed to fetch card details for', cardToDisplay.id)
      return
    }

    if (card.link && Array.isArray(card.link) && card.link.length > 0) {
      // Sanitize and deduplicate link IDs to prevent redundant fetches.
      const baseIds = [...new Set(card.link.map((linkId) => linkId.replace(/[a-zA-Z]+$/, '')))]
      const fetchedLinks = await Promise.all(
        baseIds.map(
          async (baseId) => await fetchCardsByBaseIdAndPrefix(baseId, cardToDisplay.cardIdPrefix)
        )
      )
      linkedCardsDetails.value = fetchedLinks
        .flat()
        .filter(Boolean)
        .sort((a, b) => collator.compare(a.name, b.name))
    } else {
      linkedCardsDetails.value = []
    }
    isModalVisible.value = true
    selectedCardData.value = card
  } catch (error) {
    console.error('Error handling show new card:', error)
    // Optionally, show a snackbar or other user-facing error message
  }
}

/**
 * Handles the click event on a card in the deck sidebar.
 * Depending on the active mode ('add', 'remove', 'none'), it will add/remove the card from the deck or display its details in the modal.
 * @param {object} item - The card item that was clicked.
 */
const handleCardClick = async (item) => {
  switch (activeMode.value) {
    case 'add':
      deckStore.addCard(item)
      break
    case 'remove':
      deckStore.removeCard(item.id)
      break
    default: {
      await handleShowNewCard({ card: item })
      break
    }
  }
}
</script>

<style scoped>
.card-container {
  position: relative;
  cursor: pointer;
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
  left: 8px;
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

.cover-card-container .clickable {
  cursor: pointer;
  border: 2px solid transparent;
  transition:
    border-color 0.2s ease-in-out,
    box-shadow 0.2s ease-in-out;
}

.cover-card-container .selected-cover {
  border-color: rgb(216, 102, 102);
  box-shadow: 0 0 10px 3px rgba(223, 137, 137, 0.6);
}
</style>
