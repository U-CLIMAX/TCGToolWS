<template>
  <v-container
    v-if="cards.length === 0"
    class="d-flex align-center justify-center text-grey h-100 w-100"
    :="$attrs"
  >
    <div class="rwd-text-wapper" :class="{ glass_wapper: hasBackgroundImage }">
      <h1 class="rwd-text">{{ emptyText }}</h1>
    </div>
  </v-container>

  <v-infinite-scroll
    v-else
    ref="infiniteScrollRef"
    class="overflow-x-hidden py-4"
    :class="{ 'hide-loader': shouldHideLoader }"
    @load="load"
    empty-text=""
    :margin="margin"
    :="$attrs"
  >
    <div v-if="isListVisible">
      <TransitionGroup
        :name="isTransitionDisabled ? '' : 'card-transition'"
        tag="div"
        class="card-grid-container"
        :class="{
          'freeze-layout': isLayoutFrozen,
          'table-mode-grid': isTableMode,
          'mb-15': !smAndUp,
        }"
        :style="{
          paddingTop: `${headerOffsetHeight + 1}px`,
          gridTemplateColumns: frozenColumns,
        }"
      >
        <div
          v-for="card in displayedCards"
          :key="card.id"
          class="d-flex justify-center"
          :data-card-id="card.id"
        >
          <LazyCardWrapper>
            <CardTemplate
              :card="card"
              :is-table-mode="isTableMode"
              :card-count="cardCounts[card.id] || 0"
              :card-price="cardPrices[card.id] || null"
              :is-deck-full="isDeckFull"
              :is-compact="isCompact"
              :card-click-mode="uiStore.cardClickMode"
              :has-background-image="hasBackgroundImage"
              :is-touch="isTouch"
              :sm-and-down="smAndDown"
              @show-details="onShowDetails"
              @add-card="deckStore.addCard"
              @remove-card="deckStore.removeCard"
              @deck-full="uiStore.cardClickMode = 'none'"
            />
          </LazyCardWrapper>
        </div>
      </TransitionGroup>
    </div>
  </v-infinite-scroll>

  <v-dialog
    v-if="selectedCardData"
    v-model="isModalVisible"
    :fullscreen="!smAndUp"
    :max-width="!smAndUp ? undefined : smAndDown ? '80%' : '60%'"
    :max-height="!smAndUp ? undefined : '95%'"
    :min-height="!smAndUp ? undefined : '60%'"
    :close-on-back="!smAndUp ? true : false"
  >
    <CardDetailModal
      :card="selectedCardData.card"
      :img-url="selectedCardData.imageUrl"
      :blur-url="selectedCardData.blurUrl"
      :price="selectedCardData.price"
      :price-update-times="selectedCardData.priceUpdateTimes"
      :linked-cards="selectedLinkedCards"
      :is-loading-links="isLoadingLinks"
      :showActions="$route.name === 'GlobalSearch' ? false : true"
      :card-index="selectedCardIndex"
      :total-cards="displayedCards.length"
      @close="isModalVisible = false"
      @show-new-card="onShowNewCard"
      @prev-card="onPrevCard"
      @load-more="load({ done: () => {} })"
      @next-card="onNextCard"
    />
  </v-dialog>

  <BackToTopButton :scroll-container="scrollContainer" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { fetchCardByIdAndPrefix, fetchCardsByBaseIdAndPrefix, getCardSeriesId } from '@/utils/card'
import { getCardUrls } from '@/utils/getCardImage'
import { useCardNavigation } from '@/composables/useCardNavigation.js'
import { useUIStore } from '@/stores/ui'
import { usePriceStore } from '@/stores/price'
import { useDeckStore } from '@/stores/deck'
import { useAuthStore } from '@/stores/auth'
import { useDevice } from '@/composables/useDevice'
import { storeToRefs } from 'pinia'
import { sortCards } from '@/utils/cardsSort'

const props = defineProps({
  cards: {
    type: Array,
    required: true,
  },
  itemsPerLoad: {
    type: Number,
    default: 24,
  },
  emptyText: {
    type: String,
    default: '~没有更多卡片~',
  },
  margin: {
    type: [String, Number],
    default: 300,
  },
  headerOffsetHeight: {
    type: Number,
    default: 0,
  },
  isTableModeActive: {
    type: Boolean,
    default: false,
  },
})

const { smAndUp, smAndDown, xs } = useDisplay()
const uiStore = useUIStore()
const priceStore = usePriceStore()
const deckStore = useDeckStore()
const authStore = useAuthStore()
const { userRole } = storeToRefs(authStore)
const { isTouch } = useDevice()
const { isPerformanceMode } = storeToRefs(uiStore)
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const cardCounts = computed(() => {
  const counts = {}
  for (const id in deckStore.cardsInDeck) {
    counts[id] = deckStore.cardsInDeck[id].quantity
  }
  return counts
})

const cardPrices = computed(() => {
  const prices = {}
  for (const card of props.cards) {
    prices[card.id] = getPrice(card)
  }
  return prices
})

const isDeckFull = computed(() => {
  return deckStore.totalCardCount >= 50 && userRole.value === 0
})

const isCompact = computed(() => {
  return (uiStore.isFilterOpen && uiStore.isCardDeckOpen) || smAndDown.value
})

// Handle edge case: In xs layout, when the infinite scroll content is less than or equal to one row,
// the load function won't be triggered automatically. Therefore, v-progress-circular must be manually hidden.
const shouldHideLoader = computed(() => xs.value && props.cards.length <= 3)

const isModalVisible = ref(false)
const selectedCardData = ref(null)
const selectedLinkedCards = ref([])
const isLoadingLinks = ref(false)
const isTransitionDisabled = ref(false)
const isListVisible = ref(true)

const page = ref(1)
const displayedCards = computed(() => props.cards.slice(0, page.value * props.itemsPerLoad))
const selectedCard = computed(() => selectedCardData.value?.card)

watch(
  () => displayedCards.value.length,
  (newLength) => {
    uiStore.setRenderedCardsCount(newLength)
  },
  { immediate: true }
)

const { selectedCardIndex, getPrevCard, getNextCard } = useCardNavigation(
  displayedCards,
  selectedCard
)

const isTableMode = computed(() => props.isTableModeActive || !smAndUp.value)

const getPrice = (card) => {
  const infos = getCardSeriesId(card.id)
  if (!infos || infos.length === 0) return null

  for (const info of infos) {
    const price = priceStore.getPrice(info.id, card.id)
    if (price) {
      return price.toLocaleString()
    }
  }
  return null
}

const getPriceUpdateTimes = async (card) => {
  const infos = getCardSeriesId(card.id)
  if (!infos || infos.length === 0) return null

  for (const info of infos) {
    const price = priceStore.getPrice(info.id, card.id)
    if (price) {
      const times = await priceStore.getPriceUpdateTime(info.id)
      return times
    }
  }
  return null
}

const onPrevCard = async () => {
  const prevCard = getPrevCard()
  if (prevCard) {
    const { base, blur } = getCardUrls(prevCard.cardIdPrefix, prevCard.id)
    const updateTimes = await getPriceUpdateTimes(prevCard)
    onShowDetails({
      card: prevCard,
      imageUrl: base,
      blurUrl: blur,
      price: getPrice(prevCard),
      priceUpdateTimes: updateTimes,
    })
  }
}

const onNextCard = async () => {
  const nextCard = getNextCard()
  if (nextCard) {
    const { base, blur } = getCardUrls(nextCard.cardIdPrefix, nextCard.id)
    const updateTimes = await getPriceUpdateTimes(nextCard)
    onShowDetails({
      card: nextCard,
      imageUrl: base,
      blurUrl: blur,
      price: getPrice(nextCard),
      priceUpdateTimes: updateTimes,
    })
  }
}

const fetchLinkedCards = async (card) => {
  try {
    const cardToDisplay = await fetchCardByIdAndPrefix(card.id, card.cardIdPrefix)

    if (cardToDisplay && cardToDisplay.link && cardToDisplay.link.length > 0) {
      const linkedCardsData = await Promise.all(
        cardToDisplay.link.map((linkId) =>
          fetchCardsByBaseIdAndPrefix(linkId, cardToDisplay.cardIdPrefix)
        )
      )

      if (selectedCardData.value?.card?.id === card.id) {
        const flatCards = linkedCardsData.flat().filter(Boolean)
        const cardsWithPrice = flatCards.map((c) => ({
          ...c,
          price: getPrice(c),
        }))
        selectedLinkedCards.value = sortCards(cardsWithPrice)
      }
    }
  } catch (error) {
    console.error('Failed to fetch linked cards:', error)
  } finally {
    isLoadingLinks.value = false
  }
}

const onShowDetails = async (payload) => {
  isLoadingLinks.value = true
  selectedLinkedCards.value = []
  const updateTimes = await getPriceUpdateTimes(payload.card)
  selectedCardData.value = {
    ...payload,
    priceUpdateTimes: updateTimes,
  }
  isModalVisible.value = true
  await fetchLinkedCards(payload.card)
}

const onShowNewCard = async (payload) => {
  isLoadingLinks.value = true
  selectedLinkedCards.value = []
  const updateTimes = await getPriceUpdateTimes(payload.card)
  selectedCardData.value = {
    ...payload,
    priceUpdateTimes: updateTimes,
  }
  await fetchLinkedCards(payload.card)
}

const infiniteScrollRef = ref(null)

const load = async ({ done }) => {
  if (displayedCards.value.length >= props.cards.length) {
    return done('empty')
  }
  await new Promise((resolve) => setTimeout(resolve, 150))
  page.value++
  done('ok')
}

const reset = async () => {
  if (isPerformanceMode.value.infScrollResetOpti && page.value > 1) {
    isListVisible.value = false // Unmount the list container
    await nextTick() // Wait for the DOM to be updated (container removed)
    page.value = 1 // Now that the DOM is clean, reset the page. This won't trigger a large DOM operation because the v-for is not in the DOM.
    isListVisible.value = true // Re-mount the container. It will now render only the first page.
  } else {
    page.value = 1 // For normal mode or if already on page 1, just reset the page.
  }

  // Finally, reset the infinite scroller component itself.
  if (infiniteScrollRef.value) {
    // Wait for the list to be re-mounted and visible
    await nextTick()
    // Check the ref's existence after awaiting, as it may have become null.
    if (infiniteScrollRef.value) {
      infiniteScrollRef.value.reset()
      await nextTick()
      if (infiniteScrollRef.value?.$el) {
        infiniteScrollRef.value.$el.scrollTop = 0
      }
    }
  }
}

const getScrollState = () => {
  return {
    page: page.value,
    scrollTop: infiniteScrollRef.value?.$el.scrollTop ?? 0,
  }
}

const restoreScrollState = (state) => {
  if (state) {
    page.value = state.page
    nextTick(() => {
      if (infiniteScrollRef.value?.$el) {
        infiniteScrollRef.value.$el.scrollTop = state.scrollTop
      }
    })
  }
}

defineExpose({
  reset,
  getScrollState,
  restoreScrollState,
})

const scrollContainer = ref(null)

// Layout freeze logic for smooth sidebar transitions
const isLayoutFrozen = ref(false)
const frozenColumns = ref(null)
const gridElement = ref(null)
let freezeTimeout = null

const captureCurrentColumns = () => {
  if (!gridElement.value) return null

  const computedStyle = window.getComputedStyle(gridElement.value)
  return computedStyle.gridTemplateColumns
}

const freezeLayout = () => {
  // Capture current column layout before sidebar animation
  frozenColumns.value = captureCurrentColumns()
  isLayoutFrozen.value = true

  // Clear any existing timeout
  if (freezeTimeout) {
    clearTimeout(freezeTimeout)
  }

  // Unfreeze after sidebar animation completes (0.4s) + small buffer
  freezeTimeout = setTimeout(() => {
    isLayoutFrozen.value = false
    // Wait one more frame before clearing frozen columns to allow smooth transition
    requestAnimationFrame(() => {
      frozenColumns.value = null
    })
  }, 450)
}

// Watch sidebar states from UI store
watch([() => uiStore.isFilterOpen, () => uiStore.isCardDeckOpen], () => {
  if (!isPerformanceMode.value.sideBarAnimSimp) freezeLayout()
})

onMounted(() => {
  // Use the v-infinite-scroll element as the scroll container
  scrollContainer.value = infiniteScrollRef.value?.$el

  if (!scrollContainer.value) {
    // Fallback if the ref isn't available for some reason
    scrollContainer.value = document.documentElement
  }
})

watch(isListVisible, (isVisible) => {
  if (isVisible) {
    nextTick(() => {
      if (infiniteScrollRef.value?.$el) {
        gridElement.value = infiniteScrollRef.value.$el.querySelector('.card-grid-container')
      }
    })
  }
})

// Watch infiniteScrollRef to ensure gridElement is set when the component becomes available
watch(infiniteScrollRef, (newValue) => {
  if (newValue) {
    nextTick(() => {
      gridElement.value = newValue.$el?.querySelector('.card-grid-container')
    })
  }
})

onUnmounted(() => {
  uiStore.setRenderedCardsCount(0)
  if (freezeTimeout) {
    clearTimeout(freezeTimeout)
  }
})
</script>

<style scoped>
.card-grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  width: 100%;
}

.card-grid-container.table-mode-grid {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

/* When layout is frozen, use the captured column layout */
.card-grid-container.freeze-layout {
  transition: none;
}

/*
 * Enter Animation: Pop-up effect for new cards.
 * When a new card is added to the DOM, it scales up from a transparent,
 * smaller state.
 */
.card-transition-enter-from {
  opacity: 0;
  transform: scale(0);
}
.card-transition-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.card-transition-enter-to {
  opacity: 1;
  transform: scale(1);
}

/*
 * Leave Animation: Its main purpose is to allow time for the move animation
 * and to hide rendering artifacts. `position: absolute` takes the element out
 * of the document flow, so the move animation can play. `opacity: 0` hides
 * potential visual glitches where the element might "jump" before being removed.
 */
.card-transition-leave-active {
  transition: opacity 0.3s ease;
  position: absolute;
}

.card-transition-leave-to {
  opacity: 0;
}

/*
 * Move Animation: Allows remaining cards to move smoothly to their new
 * positions after filtering. This is triggered by the FLIP mechanism.
 */
.card-transition-move {
  transition: transform 0.5s ease;
}

/* 740 is a mysterious number, a chosen number woven from human effort, blood, and tears. */
@media (max-width: 740px) {
  .card-grid-container {
    gap: 8px;
    grid-template-columns: repeat(auto-fill, minmax(46%, 1fr));
  }

  .card-grid-container.table-mode-grid {
    grid-template-columns: repeat(auto-fill, minmax(30%, 1fr)); /* 3 cards in xs for table mode */
  }
}

.v-infinite-scroll.hide-loader :deep(.v-infinite-scroll__side .v-progress-circular) {
  display: none;
}
</style>
