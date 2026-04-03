<template>
  <v-container fluid class="h-100 pa-0">
    <div v-if="filterStore.isLoading" class="d-flex justify-center align-center h-100">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>

    <div v-else class="d-flex flex-column h-100">
      <div ref="headerRef" class="overlay-header px-4 pa-1" :class="smAndUp ? 'mt-4' : 'mt-0'">
        <div class="overlay-header-content">
          <div
            :class="{
              'glass-header': uiStore.backgroundImage && smAndUp,
              'bg-surface': !uiStore.backgroundImage,
              'header-left': smAndUp,
            }"
          >
            <v-btn
              v-if="smAndUp"
              :icon="filterIcon"
              variant="text"
              density="compact"
              @click="isFilterOpen = !isFilterOpen"
              v-tooltip:bottom="{ text: isFilterOpen ? '关闭筛选' : '开启筛选', disabled: isTouch }"
            ></v-btn>
          </div>

          <div class="header-center d-flex align-center">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              density="compact"
              :to="{ name: 'SeriesCardTable' }"
              class="flex-shrink-0"
            ></v-btn>
            <h1
              class="text-h6 text-sm-h5 text-truncate text-center px-2 flex-grow-1"
              style="min-width: 0"
            >
              {{ seriesName.replace('[cn]', '') }}
            </h1>
            <v-chip
              :size="smAndUp ? 'default' : 'x-small'"
              prepend-icon="mdi-cards-diamond-outline"
              class="counter-chip font-weight-bold flex-shrink-0"
            >
              {{ filterStore.filteredCards.length }}
            </v-chip>
            <v-fade-transition>
              <div v-if="priceStore.isLoading" class="ml-2 d-flex align-center flex-shrink-0">
                <v-progress-circular
                  indeterminate
                  :size="smAndUp ? 18 : 14"
                  :width="2"
                  color="primary"
                ></v-progress-circular>
                <span v-if="smAndUp" class="text-caption ml-1 text-medium-emphasis">
                  价格加载中
                </span>
              </div>
            </v-fade-transition>
          </div>

          <div
            :class="{
              'glass-header': uiStore.backgroundImage && smAndUp,
              'bg-surface': !uiStore.backgroundImage,
              'header-right': smAndUp,
            }"
          >
            <v-btn
              v-if="smAndUp"
              :icon="isTableModeActive ? 'mdi-grid' : 'mdi-grid-large'"
              variant="text"
              density="compact"
              @click="isTableModeActive = !isTableModeActive"
              v-tooltip:bottom="{
                text: isTableModeActive ? '切换预设模式' : '切换紧凑模式',
                disabled: isTouch,
              }"
            ></v-btn>
            <v-badge
              v-if="smAndUp"
              :content="deckStore.totalCardCount"
              :model-value="deckStore.totalCardCount > 0"
              color="primary"
              offset-x="3"
              offset-y="3"
            >
              <v-btn
                :icon="isCardDeckOpen ? 'mdi-cards' : 'mdi-cards-outline'"
                variant="text"
                density="compact"
                @click="isCardDeckOpen = !isCardDeckOpen"
                v-tooltip:bottom="{
                  text: isCardDeckOpen ? '隐藏卡组' : '检视卡组',
                  disabled: isTouch,
                }"
              ></v-btn>
            </v-badge>
          </div>
        </div>
      </div>

      <div
        class="d-flex flex-row overflow-hidden fill-height"
        style="position: relative"
        :class="{ 'performance-mode': isPerformanceMode.sideBarAnimSimp }"
      >
        <template v-if="smAndUp">
          <div class="sidebar-container" :class="{ 'left-sidebar-open': isFilterOpen }">
            <BaseFilterSidebar
              class="fill-height pl-4 pb-4"
              :header-offset-height="headerOffsetHeight"
            />
          </div>
        </template>

        <CardInfiniteScrollList
          ref="listRef"
          :cards="filterStore.filteredCards"
          :header-offset-height="headerOffsetHeight"
          :is-table-mode-active="isTableModeActive"
          margin="300"
          class="flex-grow-1 themed-scrollbar px-4"
          :style="{ '--sb-margin-top': `${headerOffsetHeight + 20}px` }"
        />
        <template v-if="smAndUp">
          <div class="sidebar-container" :class="{ 'right-sidebar-open': isCardDeckOpen }">
            <DeckSidebar class="fill-height pr-4 pb-4" :header-offset-height="headerOffsetHeight" />
          </div>
        </template>
      </div>

      <!-- Mobile FABs for Bottom Sheet -->
      <div v-if="!smAndUp" style="height: 0px; overflow-y: hidden">
        <div class="fab-bottom-left-container d-flex ga-3">
          <v-btn
            icon="mdi-filter"
            size="default"
            color="primary"
            class="opacity-90"
            :class="{ 'mb-15': smAndDown }"
            @click="sheetContent = 'filter'"
          ></v-btn>

          <v-badge
            :content="deckStore.totalCardCount"
            :model-value="deckStore.totalCardCount > 0"
            color="on-background"
            offset-x="8"
            offset-y="8"
            class="opacity-90"
          >
            <v-btn
              icon="mdi-cards"
              size="default"
              color="primary"
              class="opacity-90"
              @click="sheetContent = 'deck'"
            ></v-btn>
          </v-badge>
        </div>
      </div>

      <!-- Bottom Sheet for Mobile  -->
      <DraggableBottomSheet v-model:content="sheetContent">
        <template #header="{ content }">
          <span class="text-h6">{{ content === 'filter' ? '筛选' : '卡组' }}</span>
        </template>
        <template #default="{ contentHeight, content }">
          <BaseFilterSidebar
            v-if="content === 'filter'"
            :header-offset-height="0"
            :container-height="contentHeight"
            transparent
          />
          <DeckSidebar
            v-if="content === 'deck'"
            :header-offset-height="0"
            :container-height="contentHeight"
            transparent
          />
        </template>
      </DraggableBottomSheet>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, watchEffect, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { storeToRefs } from 'pinia'
import { seriesMap } from '@/maps/series-map.js'
import { useDeckStore } from '@/stores/deck'
import { useFilterStore } from '@/stores/filter'
import { useUIStore } from '@/stores/ui'
import { useRecentStore } from '@/stores/recent'
import { usePriceStore } from '@/stores/price'
import { useInfiniteScrollState } from '@/composables/useInfiniteScrollState.js'
import { useDevice } from '@/composables/useDevice'
import { getCardSeriesId } from '@/utils/card'
import CardInfiniteScrollList from '@/components/card/CardInfiniteScrollList.vue'
import BaseFilterSidebar from '@/components/ui/FilterSidebar.vue'
import DeckSidebar from '@/components/ui/DeckSidebar.vue'
import DraggableBottomSheet from '@/components/ui/DraggableBottomSheet.vue'

const props = defineProps({
  seriesId: {
    type: String,
    required: true,
  },
  initialProductName: {
    type: String,
    default: null,
  },
})

const route = useRoute()
const router = useRouter()
const { smAndUp, smAndDown, lgAndUp } = useDisplay()

const deckStore = useDeckStore()
const filterStore = useFilterStore()
const uiStore = useUIStore()
const recentStore = useRecentStore()
const priceStore = usePriceStore()
const { isTouch } = useDevice()
const headerRef = ref(null)
const { isCardDeckOpen, isFilterOpen, isTableModeActive, isPerformanceMode } = storeToRefs(uiStore)
const rawHeaderHeight = ref(0)
const filterIcon = computed(() => (isFilterOpen.value ? 'mdi-filter-off' : 'mdi-filter'))
const headerOffsetHeight = computed(() => rawHeaderHeight.value)
const listRef = ref(null)
const sheetContent = ref(null)

const observer = new ResizeObserver(([entry]) => {
  if (entry && entry.target) {
    rawHeaderHeight.value = entry.target.offsetHeight
  }
})

watchEffect(() => {
  if (headerRef.value) {
    observer.observe(headerRef.value)
  }
})

watchEffect(() => {
  const extra = smAndUp.value ? 80 : 10
  uiStore.setHeaderHeight(headerOffsetHeight.value + extra)
})

watch(isFilterOpen, (newValue) => {
  if (newValue && !lgAndUp.value) {
    isCardDeckOpen.value = false
  }
})

watch(isCardDeckOpen, (newValue) => {
  if (newValue && !lgAndUp.value) {
    isFilterOpen.value = false
  }
})

// Close one sidebar if resizing from desktop to a smaller screen with both sidebars open
watch(lgAndUp, (isDesktop) => {
  if (!isDesktop && isFilterOpen.value && isCardDeckOpen.value) {
    isCardDeckOpen.value = false
  }
})

const seriesName = computed(() => {
  const foundEntry = Object.entries(seriesMap).find(([, value]) => value.id === props.seriesId)
  return foundEntry ? foundEntry[0] : '未知系列'
})
const prefixes = computed(() => seriesMap[seriesName.value]?.prefixes ?? [])
const yytUrl = computed(() => seriesMap[seriesName.value]?.yytUrl)

// 使用雜湊函式，將長名稱轉換為短序號 (Base36)
const getShortHash = (str) => {
  if (!str) return undefined
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

watch(
  prefixes,
  async (newPrefixes) => {
    await filterStore.initialize(newPrefixes)

    // 從 URL 恢復產品篩選狀態 (透過雜湊值比對)
    if (props.initialProductName) {
      const found = filterStore.productNames.find(
        (name) => getShortHash(name) === props.initialProductName
      )
      if (found) {
        filterStore.selectedProductName = found
      }
    }
  },
  { immediate: true }
)

// 監聽 URL 參數變化 (如：點擊瀏覽器後退)，同步到 Store
watch(
  () => props.initialProductName,
  (newVal) => {
    if (!newVal) {
      filterStore.selectedProductName = null
      return
    }
    const found = filterStore.productNames.find((name) => getShortHash(name) === newVal)
    if (found && found !== filterStore.selectedProductName) {
      filterStore.selectedProductName = found
    }
  }
)
// 當產品名稱改變時，同步更新 URL
watch(
  () => filterStore.selectedProductName,
  (newVal) => {
    const hash = getShortHash(newVal)
    // 僅在不同時更新，避免無限迴圈
    if (route.query.p !== hash) {
      router.replace({
        query: {
          ...route.query,
          p: hash,
        },
      })
    }
  }
)

watch([() => filterStore.filteredCards], () => {
  if (listRef.value) {
    listRef.value.reset()
  }
})

const initializePrices = async () => {
  const configs = []

  // Current series
  if (yytUrl.value) {
    configs.push({ seriesId: props.seriesId, yytUrl: yytUrl.value })
  }

  // Cards in deck series
  const cards = Object.values(deckStore.cardsInDeck)
  if (cards.length > 0) {
    // Collect unique series configs from deck cards
    const seriesConfigMap = new Map()
    cards.forEach((c) => {
      const info = getCardSeriesId(c.id)
      if (info && info.id && info.yytUrl && !seriesConfigMap.has(info.id)) {
        seriesConfigMap.set(info.id, { seriesId: info.id, yytUrl: info.yytUrl })
      }
    })

    seriesConfigMap.forEach((config) => {
      // Avoid duplicate config if it's already the current series
      if (config.seriesId !== props.seriesId) {
        configs.push(config)
      }
    })
  }

  if (configs.length > 0) {
    // Use the updated bulk fetch method
    await priceStore.fetchPrices(configs)
  }
}

onMounted(() => {
  recentStore.addSeries(props.seriesId)
  initializePrices()
})

onUnmounted(() => {
  observer.disconnect()
  filterStore.reset()
})

const storageKey = computed(() => `seriesDetailViewState_${props.seriesId}`)

useInfiniteScrollState({
  storageKey,
  scrollRef: listRef,
  onSave: () => listRef.value?.getScrollState(),
  onRestore: (savedState) => {
    listRef.value?.restoreScrollState(savedState)
  },
  loadingRef: computed(() => filterStore.isLoading),
})
</script>

<style scoped>
.sidebar-container {
  overflow: hidden;
  flex-shrink: 0;
  width: 0;
  transition: width 0.4s ease-in-out;
}

.performance-mode > .sidebar-container {
  opacity: 0;
  pointer-events: none;
  /*
    On CLOSE: Animate opacity over 0.2s.
    Delay the width change until after the opacity animation is finished.
  */
  transition:
    opacity 0.2s ease-in-out,
    width 0s ease-in-out 0.2s;
}

.performance-mode > .sidebar-container.left-sidebar-open,
.performance-mode > .sidebar-container.right-sidebar-open {
  opacity: 1;
  pointer-events: auto;
  /*
    ON OPEN: Animate opacity over 0.2s.
    Make the width change instant by removing the delay.
  */
  transition: opacity 0.2s ease-in-out;
}

/* Small tablet (sm) */
@media (min-width: 600px) and (max-width: 959.98px) {
  .sidebar-container.left-sidebar-open,
  .sidebar-container.right-sidebar-open {
    width: 51%;
  }
}

/* Medium tablet (md) */
@media (min-width: 960px) and (max-width: 1279.98px) {
  .sidebar-container.left-sidebar-open,
  .sidebar-container.right-sidebar-open {
    width: 35%;
  }
}

/* Desktop (lg, xl) */
@media (min-width: 1280px) {
  .sidebar-container.left-sidebar-open {
    width: 15%;
  }

  .sidebar-container.right-sidebar-open {
    width: 25%;
  }
}

.fab-bottom-left-container {
  position: fixed;
  bottom: 16px;
  left: 16px;
  z-index: 10;
}

@media (max-width: 599.98px) {
  .sidebar-container {
    position: absolute;
    z-index: 10;
    background: rgb(var(--v-theme-surface));
    height: 100%;
    top: 0;
    right: 0;
  }

  .sidebar-container.left-sidebar-open,
  .sidebar-container.right-sidebar-open {
    width: 100%;
  }
}

t-sidebar-open {
  width: 100%;
}
</style>
