<template>
  <v-container
    v-if="cards.length === 0"
    class="d-flex align-center justify-center text-grey h-100 w-100"
    :="$attrs"
  >
    <div class="rwd-text-wapper">
      <h1 class="rwd-text">{{ emptyText }}</h1>
    </div>
  </v-container>

  <v-infinite-scroll
    v-else
    ref="infiniteScrollRef"
    class="overflow-x-hidden"
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
        :class="{ 'freeze-layout': isLayoutFrozen, 'table-mode-grid': isTableMode }"
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
          <CardTemplate :card="card" :is-table-mode="isTableMode" @show-details="onShowDetails" />
        </div>
      </TransitionGroup>
    </div>
  </v-infinite-scroll>

  <v-dialog
    v-if="selectedCardData"
    v-model="isModalVisible"
    :fullscreen="xs"
    :max-width="smAndDown ? undefined : '60%'"
    :max-height="smAndDown ? undefined : '95%'"
    :min-height="smAndDown ? undefined : '60%'"
  >
    <CardDetailModal
      :card="selectedCardData.card"
      :img-url="selectedCardData.imageUrl"
      :linked-cards="selectedLinkedCards"
      :is-loading-links="isLoadingLinks"
      :showActions="true"
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
import CardTemplate from '@/components/card/CardTemplate.vue'
import CardDetailModal from '@/components/card/CardDetailModal.vue'
import BackToTopButton from '@/components/ui/BackToTopButton.vue'
import { fetchCardByIdAndPrefix, fetchCardsByBaseIdAndPrefix } from '@/utils/card'
import { useCardImage } from '@/composables/useCardImage.js'
import { useCardNavigation } from '@/composables/useCardNavigation.js'
import { useUIStore } from '@/stores/ui'
import { storeToRefs } from 'pinia'
import collator from '@/utils/collator.js'

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

const { smAndDown, smAndUp, xs } = useDisplay()
const uiStore = useUIStore()
const { isPerformanceMode } = storeToRefs(uiStore)

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

const onPrevCard = () => {
  const prevCard = getPrevCard()
  if (prevCard) {
    onShowDetails({
      card: prevCard,
      imageUrl: useCardImage(prevCard.cardIdPrefix, prevCard.id).value,
    })
  }
}

const onNextCard = () => {
  const nextCard = getNextCard()
  if (nextCard) {
    onShowDetails({
      card: nextCard,
      imageUrl: useCardImage(nextCard.cardIdPrefix, nextCard.id).value,
    })
  }
}

const fetchLinkedCards = async (card) => {
  try {
    isLoadingLinks.value = true

    const cardToDisplay = await fetchCardByIdAndPrefix(card.id, card.cardIdPrefix)
    // sanitize all link IDs to get clean base IDs.
    const baseIds = [
      ...new Set(cardToDisplay.link.map((linkId) => linkId.replace(/[a-zA-Z]+$/, ''))),
    ]
    const linkRequests = baseIds.map(
      async (baseId) => await fetchCardsByBaseIdAndPrefix(baseId, cardToDisplay.cardIdPrefix)
    )

    const linkedCardsData = await Promise.all(linkRequests)
    selectedLinkedCards.value = linkedCardsData
      .flat()
      .filter(Boolean)
      .sort((a, b) => collator.compare(a.name, b.name))
  } catch (error) {
    console.error('Failed to fetch linked cards:', error)
    selectedLinkedCards.value = []
  } finally {
    isLoadingLinks.value = false
  }
}

const onShowDetails = async (payload) => {
  selectedCardData.value = payload
  isModalVisible.value = true
  await fetchLinkedCards(payload.card)
}

const onShowNewCard = async (payload) => {
  selectedCardData.value = payload
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
