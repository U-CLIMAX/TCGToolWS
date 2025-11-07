<template>
  <v-container fluid class="h-100 pa-0">
    <div v-if="filterStore.isLoading" class="d-flex justify-center align-center h-100">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>

    <div v-else class="d-flex flex-column h-100">
      <div ref="headerRef" class="overlay-header pl-4 pr-4 pa-1">
        <div class="overlay-header-content">
          <div class="header-left">
            <v-btn
              v-if="smAndUp"
              :size="resize"
              :icon="filterIcon"
              variant="text"
              @click="isFilterOpen = !isFilterOpen"
            ></v-btn>
          </div>

          <div class="header-center d-flex align-center">
            <v-btn
              :size="resize"
              icon="mdi-arrow-left"
              variant="text"
              :to="{ name: 'SeriesCardTable' }"
              class="flex-shrink-0"
            ></v-btn>
            <h1
              class="text-h6 text-sm-h5 text-truncate text-center px-2 flex-grow-1"
              style="min-width: 0"
            >
              {{ seriesName }}
            </h1>
            <v-chip
              :size="resize"
              prepend-icon="mdi-cards-diamond-outline"
              class="counter-chip font-weight-bold flex-shrink-0"
            >
              {{ filterStore.filteredCards.length }}
            </v-chip>
          </div>

          <div class="header-right">
            <v-btn
              v-if="smAndUp"
              :size="resize"
              :icon="isTableModeActive ? 'mdi-grid' : 'mdi-grid-large'"
              variant="text"
              @click="isTableModeActive = !isTableModeActive"
            ></v-btn>
            <v-badge
              v-if="smAndUp"
              :content="deckStore.totalCardCount"
              :model-value="deckStore.totalCardCount > 0"
              color="primary"
              offset-x="6"
              offset-y="12"
            >
              <v-btn
                :size="resize"
                :icon="isCardDeckOpen ? 'mdi-cards' : 'mdi-cards-outline'"
                variant="text"
                @click="isCardDeckOpen = !isCardDeckOpen"
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
          margin=" 300"
          class="flex-grow-1 themed-scrollbar pl-4 pr-4"
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
            size="large"
            color="primary"
            class="opacity-90"
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
              size="large"
              color="primary"
              class="opacity-90"
              @click="sheetContent = 'deck'"
            ></v-btn>
          </v-badge>
        </div>
      </div>

      <!-- Bottom Sheet for Mobile  -->
      <DraggableBottomSheet v-model:content="sheetContent">
        <template #header>
          <span class="text-h6">{{ sheetContent === 'filter' ? '筛选' : '卡组' }}</span>
        </template>
        <template #default="{ contentHeight }">
          <BaseFilterSidebar
            v-if="sheetContent === 'filter'"
            :header-offset-height="0"
            :container-height="contentHeight"
            transparent
          />
          <DeckSidebar
            v-if="sheetContent === 'deck'"
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
import { useDisplay } from 'vuetify'
import { storeToRefs } from 'pinia'
import { seriesMap } from '@/maps/series-map.js'
import { useDeckStore } from '@/stores/deck'
import { useFilterStore } from '@/stores/filter'
import { useUIStore } from '@/stores/ui'
import { useRecentStore } from '@/stores/recent'
import { useInfiniteScrollState } from '@/composables/useInfiniteScrollState.js'
import CardInfiniteScrollList from '@/components/card/CardInfiniteScrollList.vue'
import BaseFilterSidebar from '@/components/ui/FilterSidebar.vue'
import DeckSidebar from '@/components/ui/DeckSidebar.vue'
import DraggableBottomSheet from '@/components/ui/DraggableBottomSheet.vue'

const props = defineProps({
  seriesId: {
    type: String,
    required: true,
  },
})

const { smAndUp, lgAndUp } = useDisplay()
const resize = computed(() => {
  return smAndUp.value ? 'default' : 'x-small'
})

const deckStore = useDeckStore()
const filterStore = useFilterStore()
const uiStore = useUIStore()
const recentStore = useRecentStore()
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

// Close bottom sheet when resizing to desktop
watch(smAndUp, (isDesktop) => {
  if (isDesktop && sheetContent.value) {
    sheetContent.value = null
  }
})

const seriesName = computed(() => {
  const foundEntry = Object.entries(seriesMap).find(([, value]) => value.id === props.seriesId)
  return foundEntry ? foundEntry[0] : '未知系列'
})
const prefixes = computed(() => seriesMap[seriesName.value]?.prefixes ?? [])

watchEffect(() => {
  filterStore.initialize(prefixes.value)
})

watch([() => filterStore.filteredCards, isTableModeActive], () => {
  if (listRef.value) {
    listRef.value.reset()
  }
})

onMounted(() => {
  recentStore.addSeries(props.seriesId)
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

/* Bottom Sheet Overlay - 固定定位容器 */
.bottom-sheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  pointer-events: none;
}

/* Bottom Sheet 卡片 */
.bottom-sheet-card {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100vh;
  pointer-events: auto;
  will-change: transform;
  /* 使用 GPU 加速 */
  transform: translateZ(0);
  box-shadow: 0 -2px 16px rgba(0, 0, 0, 0.3);
}

/* 吸附動畫 - 只在非拖曳時啟用 */
.bottom-sheet-card.is-snapping {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sheet-header {
  display: flex;
  align-items: center;
  width: 100%;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.sheet-header:active {
  cursor: grabbing;
}

.header-spacer-left {
  width: 56px;
}

.header-drag-area {
  flex-grow: 1;
  position: relative;
  padding: 12px 0;
  text-align: center;
}

.header-close-area {
  width: 56px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.resize-handle {
  width: 80px;
  height: 4px;
  background-color: grey;
  border-radius: 2px;
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
}

/* 內容區域樣式 */
.sheet-content {
  /* 確保內容可以獨立滾動 */
  -webkit-overflow-scrolling: touch;
}

/* 針對 WebKit 瀏覽器的滾動條樣式 */
.sheet-content::-webkit-scrollbar {
  width: 8px;
}

.sheet-content::-webkit-scrollbar-track {
  background: transparent;
}

.sheet-content::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.5);
  border-radius: 4px;
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
</style>
