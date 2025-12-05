<template>
  <div class="h-100">
    <v-container fluid class="h-100 pa-0">
      <div class="d-flex flex-column h-100 overflow-hidden">
        <div ref="headerRef" class="overlay-header pl-4 pr-4 pa-1">
          <div class="overlay-header-content">
            <!-- 左側 -->
            <div class="header-left">
              <v-tooltip text="储存卡组" location="bottom">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    :size="resize"
                    variant="text"
                    @click="openSaveDialog"
                    :disabled="!deck"
                  >
                    <v-icon size="24">mdi-content-save-outline</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
            </div>

            <!-- 中間 -->
            <div class="header-center d-flex align-center">
              <h1 v-if="deck" class="text-h6 text-sm-h5 text-truncate">
                {{ deck.name }}
              </h1>
              <h1 v-else class="text-h6 text-sm-h5 text-truncate">N/A</h1>
            </div>

            <!-- 右側 -->
            <div class="header-right mt-2 ga-2">
              <template v-if="smAndUp">
                <div style="width: 120px">
                  <v-select
                    v-model="groupBy"
                    :items="groupByOptions"
                    label="分类"
                    density="compact"
                    variant="outlined"
                    hide-details
                    :disabled="!deck"
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
          <DeckCardList
            :display-grouped-cards="groupedCards"
            :stats-grouped-cards="groupedCards"
            :group-by="groupBy"
            :selected-card="selectedCardData"
            :is-modal-visible="isModalVisible"
            :linked-cards="linkedCardsDetails"
            :selected-card-index="selectedCardIndex"
            :total-cards="deckCards.length"
            @card-click="handleCardClick"
            @update:isModalVisible="isModalVisible = $event"
            @show-new-card="handleShowNewCard"
            @prev-card="onPrevCard"
            @next-card="onNextCard"
          />
        </div>
      </div>
    </v-container>

    <!-- Auth Alert Dialog -->
    <v-dialog v-model="isAuthAlertOpen" max-width="400px">
      <v-card>
        <v-card-title> 需要登录</v-card-title>
        <v-card-text> 储存卡组功能需要登录后才能使用。 </v-card-text>
        <v-card-actions>
          <v-btn color="primary" text @click="isAuthAlertOpen = false">确定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Save Deck Dialog -->
    <v-dialog v-model="isSaveDialogOpen" max-width="500px" @update:model-value="closeSaveDialog">
      <v-card>
        <v-card-title>储存卡组</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="deckName"
            label="卡组名称"
            :counter="10"
            maxlength="20"
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
              <v-col v-for="card in Object.values(cards)" :key="card.id" cols="4" lg="3">
                <div class="cover-card-container" @click="selectedCoverCardId = card.id">
                  <v-img
                    :src="useCardImage(card.cardIdPrefix, card.id).value"
                    :aspect-ratio="400 / 559"
                    cover
                    class="rounded-lg"
                    lazy-src="/empty-placehold.webp"
                    :class="{
                      'selected-cover': selectedCoverCardId === card.id,
                      'clickable': true,
                    }"
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
          <v-btn
            color="primary"
            variant="tonal"
            @click="handleSaveDeck"
            :disabled="!deckName.trim() || !selectedCoverCardId"
            >确定
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
  </div>
</template>

<script setup>
import { computed, ref, onUnmounted, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCardImage } from '@/composables/useCardImage.js'
import { useDeckEncoder } from '@/composables/useDeckEncoder'
import { useDisplay } from 'vuetify'
import { useDeckGrouping } from '@/composables/useDeckGrouping'
import { fetchCardByIdAndPrefix, fetchCardsByBaseIdAndPrefix } from '@/utils/card'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'
import { useCardNavigation } from '@/composables/useCardNavigation.js'
import collator from '@/utils/collator.js'
import DeckCardList from '@/components/deck/DeckCardList.vue'

const { smAndUp } = useDisplay()
const resize = computed(() => {
  return smAndUp.value ? 'default' : 'small'
})
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const route = useRoute()
const router = useRouter()
const { decodeDeck, encodeDeck } = useDeckEncoder()
const authStore = useAuthStore()
const uiStore = useUIStore()
const { triggerSnackbar } = useSnackbar()

const deckKey = route.params.key
const deck = ref(null)
const cards = ref({})

// Auth Alert Dialog State
const isAuthAlertOpen = ref(false)

// Save Deck Dialog State
const isSaveDialogOpen = ref(false)
const deckName = ref('')
const selectedCoverCardId = ref(null)

const flattenedDisplayCards = computed(() => {
  const cardGroups = Array.from(groupedCards.value.values())
  return cardGroups.flat()
})

const openSaveDialog = () => {
  if (!authStore.isAuthenticated) {
    isAuthAlertOpen.value = true
  } else if (deck.value) {
    deckName.value = deck.value.name || ''
    selectedCoverCardId.value = deck.value.coverCardId || Object.values(cards.value)[0]?.id
    isSaveDialogOpen.value = true
  }
}

const closeSaveDialog = (value) => {
  if (!value) {
    // Reset state when dialog is closed
    isSaveDialogOpen.value = false
    deckName.value = ''
    selectedCoverCardId.value = null
  }
}

const handleSaveDeck = async () => {
  uiStore.setLoading(true)

  try {
    const cardsToEncode = Object.values(cards.value).reduce((acc, card) => {
      acc[card.id] = {
        id: card.id,
        cardIdPrefix: card.cardIdPrefix,
        product_name: card.product_name,
        level: card.level,
        color: card.color,
        cost: card.cost,
        type: card.type,
        quantity: card.quantity,
      }
      return acc
    }, {})

    const deckData = {
      name: deckName.value,
      version: deck.value.version,
      cards: cardsToEncode,
      seriesId: deck.value.seriesId,
      coverCardId: selectedCoverCardId.value,
    }

    const { key } = await encodeDeck(deckData, { isSharedDeck: true })
    triggerSnackbar('卡组保存成功！', 'success')
    isSaveDialogOpen.value = false
    await router.push(`/decks/${key}`)
  } catch (error) {
    triggerSnackbar(error.message, 'error')
    console.error('❌ 創建失敗:', error)
  } finally {
    uiStore.setLoading(false)
  }
}

const selectGroupBy = (value) => {
  groupBy.value = value
  showBottomSheet.value = false
}

onMounted(async () => {
  uiStore.setLoading(true)

  try {
    let initialCards = {}
    const decoded = await decodeDeck(deckKey, true)
    deck.value = decoded
    initialCards = decoded.cards

    // ---獲取所有卡片的完整資料 ---
    const cardPromises = Object.values(initialCards).map(async (card) => {
      const fullCardData = await fetchCardByIdAndPrefix(card.id, card.cardIdPrefix)
      if (fullCardData) {
        return { ...fullCardData, quantity: card.quantity }
      }
      return null
    })

    const fullCardsData = (await Promise.all(cardPromises)).filter(Boolean)
    cards.value = fullCardsData.reduce((acc, card) => {
      acc[card.id] = card
      return acc
    }, {})
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

const deckCards = computed(() => Object.values(cards.value))
const { groupedCards } = useDeckGrouping(deckCards, groupBy)

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

const showBottomSheet = ref(false)
</script>

<style scoped>
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
