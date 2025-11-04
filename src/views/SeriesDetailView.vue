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
import { ref, computed, watchEffect, onUnmounted, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { storeToRefs } from 'pinia'
import { seriesMap } from '@/maps/series-map.js'
import { useDeckStore } from '@/stores/deck'
import { useFilterStore } from '@/stores/filter'
import { useUIStore } from '@/stores/ui'
import { useInfiniteScrollState } from '@/composables/useInfiniteScrollState.js'
import CardInfiniteScrollList from '@/components/card/CardInfiniteScrollList.vue'
import BaseFilterSidebar from '@/components/ui/FilterSidebar.vue'
import DeckSidebar from '@/components/ui/DeckSidebar.vue'
import { useBottomSheet } from '@/composables/useBottomSheet.js'

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
const headerRef = ref(null)
const { isCardDeckOpen, isFilterOpen, isTableModeActive, isPerformanceMode } = storeToRefs(uiStore)
const rawHeaderHeight = ref(0)
const filterIcon = computed(() => (isFilterOpen.value ? 'mdi-filter-off' : 'mdi-filter'))
const headerOffsetHeight = computed(() => rawHeaderHeight.value)
const listRef = ref(null)
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const { sheetContent, isSheetOpen, sheetHeight, startDrag } = useBottomSheet()

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

const sheetTitle = computed(() => {
  if (sheetContent.value === 'filter') return '筛选'
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
// --- End of mobile & Tablet specific logic ---

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
