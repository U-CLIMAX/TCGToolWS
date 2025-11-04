<template>
  <v-container fluid class="h-100 pa-0">
    <div
      v-if="globalSearchStore.isLoading"
      class="d-flex flex-column justify-center align-center h-100"
    >
      <v-progress-circular
        indeterminate
        color="blue-accent-1"
        size="64"
        class="mb-4"
      ></v-progress-circular>
      <div class="text-h6 text-blue-accent-1">初始化中...</div>
    </div>

    <div v-else class="d-flex flex-column h-100">
      <div ref="headerRef" class="overlay-header pl-4 pr-4 pa-1">
        <div class="overlay-header-content">
          <div class="header-left">
            <v-btn
              v-if="smAndUp"
              :size="resize"
              :icon="searchIcon"
              variant="text"
              @click="isFilterOpen = !isFilterOpen"
            ></v-btn>
          </div>

          <div class="header-center d-flex align-center">
            <h1
              class="text-h6 text-sm-h5 text-truncate text-center px-2 flex-grow-1"
              style="min-width: 0"
            >
              搜索结果
            </h1>
            <v-chip
              :size="resize"
              prepend-icon="mdi-cards-diamond-outline"
              class="counter-chip font-weight-bold flex-shrink-0"
              :color="isChipShowWarning ? 'warning' : undefined"
              :style="{ cursor: isChipShowWarning ? 'help' : undefined }"
            >
              <template v-if="isChipShowWarning">
                <v-tooltip activator="parent" location="bottom">
                  结果超过阈值，请尝试增加条件
                </v-tooltip>
              </template>
              {{ chipContent }}
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
              :global-filter="true"
            />
          </div>
        </template>

        <v-container
          v-if="displayEmptySearchMessage"
          class="d-flex align-center justify-center text-grey h-100 w-100"
        >
          <div class="rwd-text-wapper">
            <h1 class="rwd-text">{{ currentEmptyText }}</h1>
          </div>
        </v-container>

        <CardInfiniteScrollList
          v-else
          ref="cardListRef"
          :cards="globalSearchStore.searchResults"
          :header-offset-height="headerOffsetHeight"
          :is-table-mode-active="isTableModeActive"
          :empty-text="currentEmptyText"
          key="global-search-list"
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
            icon="mdi-layers-search"
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

      <!-- Bottom Sheet for Mobile -->
      <v-bottom-sheet v-model="isSheetOpen" :scrim="false" inset persistent>
        <v-card
          class="rounded-t-xl d-flex flex-column"
          :class="{ 'glass-sheet': hasBackgroundImage }"
          style="height: 100%"
        >
          <div class="sheet-header">
            <div class="header-spacer-left"></div>
            <div class="header-drag-area" @mousedown="startDrag" @touchstart.prevent="startDrag">
              <div class="resize-handle"></div>
              <div class="pt-2">
                <span class="text-h6">{{ sheetTitle }}</span>
              </div>
            </div>
            <div class="header-close-area">
              <v-btn icon="mdi-close" variant="text" @click="isSheetOpen = false"></v-btn>
            </div>
          </div>
          <v-divider></v-divider>
          <v-card-text
            class="pa-0"
            :style="{
              'height': sheetHeight + 'px',
              'overflow-y': sheetContent === 'deck' ? 'hidden' : 'auto',
            }"
          >
            <BaseFilterSidebar
              v-if="sheetContent === 'filter'"
              :header-offset-height="0"
              class="px-4"
              transparent
              :global-filter="true"
            />
            <DeckSidebar
              v-if="sheetContent === 'deck'"
              :header-offset-height="0"
              :container-height="sheetHeight"
              class="px-4"
              transparent
            />
          </v-card-text>
        </v-card>
      </v-bottom-sheet>
    </div>
  </v-container>
</template>

<script setup>
import { onMounted, ref, watch, computed, watchEffect, onUnmounted } from 'vue'
import { useDisplay } from 'vuetify'
import { storeToRefs } from 'pinia'
import { useGlobalSearchStore } from '@/stores/globalSearch'
import { useUIStore } from '@/stores/ui'
import { useDeckStore } from '@/stores/deck'
import { useInfiniteScrollState } from '@/composables/useInfiniteScrollState.js'
import CardInfiniteScrollList from '@/components/card/CardInfiniteScrollList.vue'
import BaseFilterSidebar from '@/components/ui/FilterSidebar.vue'
import DeckSidebar from '@/components/ui/DeckSidebar.vue'
import { useBottomSheet } from '@/composables/useBottomSheet.js'

const globalSearchStore = useGlobalSearchStore()
const uiStore = useUIStore()
const deckStore = useDeckStore()
const cardListRef = ref(null)
const headerRef = ref(null)
const { isFilterOpen, isTableModeActive, isCardDeckOpen, isPerformanceMode } = storeToRefs(uiStore)
const { searchCountDetails, hasActiveFilters, searchResults } = storeToRefs(globalSearchStore)
const rawHeaderHeight = ref(0)
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const { sheetContent, isSheetOpen, sheetHeight, startDrag, smAndUp } = useBottomSheet()
const { lgAndUp } = useDisplay()

const resize = computed(() => {
  return smAndUp.value ? 'default' : 'x-small'
})

const searchIcon = computed(() =>
  isFilterOpen.value ? 'mdi-layers-search' : 'mdi-layers-search-outline'
)
const headerOffsetHeight = computed(() => rawHeaderHeight.value)

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

watch(isTableModeActive, () => {
  if (cardListRef.value) {
    cardListRef.value.reset()
  }
})

const sheetTitle = computed(() => {
  if (sheetContent.value === 'filter') return '搜索'
  if (sheetContent.value === 'deck') return '卡组'
  return ''
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
  if (isDesktop && isSheetOpen.value) {
    isSheetOpen.value = false
  }
})

const displayEmptySearchMessage = computed(
  () => !hasActiveFilters.value && !globalSearchStore.isLoading
)
const currentEmptyText = computed(() =>
  displayEmptySearchMessage.value
    ? '请输入关键字或选择筛选条件以开始搜寻'
    : '~没有找到符合条件的卡片~'
)

const isChipShowWarning = computed(() => {
  return searchCountDetails.value.isCountOverThreshold && hasActiveFilters.value
})

const chipContent = computed(() => {
  if (isChipShowWarning.value) {
    return `${globalSearchStore.searchResults.length} / ${globalSearchStore.searchCountDetails.actualResultCount}`
  }
  return hasActiveFilters.value ? globalSearchStore.searchResults.length : 0
})

onMounted(() => {
  globalSearchStore.initialize()
})

watch(
  searchResults,
  () => {
    cardListRef.value?.reset()
  },
  { deep: true }
)

onUnmounted(() => {
  observer.disconnect()
  globalSearchStore.terminate()
})

const storageKey = computed(() => `globalSearchViewState`)

useInfiniteScrollState({
  storageKey,
  scrollRef: cardListRef,
  onSave: () => cardListRef.value?.getScrollState(),
  onRestore: (savedState) => {
    cardListRef.value?.restoreScrollState(savedState)
  },
  loadingRef: computed(() => globalSearchStore.isLoading),
})
</script>

<style scoped>
.sidebar-container {
  width: 0;
  transition: width 0.4s ease-in-out;
  overflow: hidden;
  flex-shrink: 0;
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
    width: 46%;
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

.sheet-header {
  display: flex;
  align-items: center;
  width: 100%;
}

.header-spacer-left {
  width: 56px; /* Balance the close button area */
}

.header-drag-area {
  flex-grow: 1;
  position: relative;
  cursor: grab;
  padding: 12px 0;
  text-align: center;
}

.header-drag-area:active {
  cursor: grabbing;
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
