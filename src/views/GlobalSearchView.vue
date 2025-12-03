<template>
  <v-container fluid class="h-100 pa-0">
    <div class="d-flex flex-column h-100">
      <div ref="headerRef" class="overlay-header pl-4 pr-4 pa-1">
        <div class="overlay-header-content">
          <div class="header-left">
            <v-tooltip :text="isFilterOpen ? '关闭搜索' : '开启搜索'" location="bottom">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-if="smAndUp"
                  v-bind="props"
                  :size="resize"
                  :icon="searchIcon"
                  variant="text"
                  @click="isFilterOpen = !isFilterOpen"
                  :disabled="globalSearchStore.isLoading"
                ></v-btn>
              </template>
            </v-tooltip>
          </div>

          <div class="header-center d-flex align-center">
            <h1
              class="text-h6 text-sm-h5 text-truncate text-center px-2 flex-grow-1 text-ws-rose font-weight-bold"
              style="min-width: 0"
            >
              {{ game.toUpperCase() }} 搜索结果
            </h1>
            <v-chip
              :size="resize"
              prepend-icon="mdi-cards-diamond-outline"
              class="counter-chip font-weight-bold flex-shrink-0"
              :color="isChipShowWarning ? 'warning' : undefined"
              :style="{ cursor: isChipShowWarning ? 'help' : undefined }"
              :disabled="globalSearchStore.isLoading"
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
            <v-tooltip
              :text="isTableModeActive ? '切换预设模式' : '切换紧凑模式'"
              location="bottom"
            >
              <template v-slot:activator="{ props }">
                <v-btn
                  v-if="smAndUp"
                  v-bind="props"
                  :size="resize"
                  :icon="isTableModeActive ? 'mdi-grid' : 'mdi-grid-large'"
                  variant="text"
                  @click="isTableModeActive = !isTableModeActive"
                  :disabled="globalSearchStore.isLoading"
                ></v-btn>
              </template>
            </v-tooltip>
            <v-badge
              v-if="smAndUp"
              :content="deckStore.totalCardCount"
              :model-value="deckStore.totalCardCount > 0"
              color="primary"
              offset-x="6"
              offset-y="12"
            >
              <v-tooltip :text="isCardDeckOpen ? '隐藏卡组' : '检视卡组'" location="bottom">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    :size="resize"
                    :icon="isCardDeckOpen ? 'mdi-cards' : 'mdi-cards-outline'"
                    variant="text"
                    @click="isCardDeckOpen = !isCardDeckOpen"
                    :disabled="globalSearchStore.isLoading"
                  ></v-btn>
                </template>
              </v-tooltip>
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
              :disabled="globalSearchStore.isLoading"
            />
          </div>
        </template>

        <div
          v-if="globalSearchStore.isLoading"
          class="d-flex flex-column justify-center align-center h-100 w-100"
        >
          <v-progress-circular
            indeterminate
            :color="globalSearchStore.isInitialSetup ? 'blue-accent-1' : 'primary'"
            size="64"
            class="mb-4"
          ></v-progress-circular>
          <div
            v-if="globalSearchStore.isInitialSetup"
            class="text-subtitle-1 text-sm-h6 text-blue-accent-1 text-center text-no-wrap"
            style="overflow: hidden; text-overflow: ellipsis"
          >
            初始化中，这可能会需要一点时间...
          </div>
        </div>

        <v-container
          v-else-if="displayEmptySearchMessage"
          class="d-flex align-center justify-center text-grey h-100 w-100"
        >
          <div class="rwd-text-wapper" :class="{ glass_wapper: hasBackgroundImage }">
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
            :disabled="globalSearchStore.isLoading"
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
              :disabled="globalSearchStore.isLoading"
            ></v-btn>
          </v-badge>
        </div>
      </div>

      <!-- Bottom Sheet for Mobile -->
      <DraggableBottomSheet v-model:content="sheetContent">
        <template #header="{ content }">
          <span class="text-h6">{{ content === 'filter' ? '搜索' : '卡组' }}</span>
        </template>
        <template #default="{ contentHeight, content }">
          <BaseFilterSidebar
            v-if="content === 'filter'"
            :header-offset-height="0"
            :container-height="contentHeight"
            :global-filter="true"
            :disabled="globalSearchStore.isLoading"
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
import { onMounted, ref, watch, computed, watchEffect, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { storeToRefs } from 'pinia'
import { useGlobalSearchStore } from '@/stores/globalSearch'
import { useUIStore } from '@/stores/ui'
import { useDeckStore } from '@/stores/deck'
import { useInfiniteScrollState } from '@/composables/useInfiniteScrollState.js'
import CardInfiniteScrollList from '@/components/card/CardInfiniteScrollList.vue'
import BaseFilterSidebar from '@/components/ui/FilterSidebar.vue'
import DeckSidebar from '@/components/ui/DeckSidebar.vue'
import DraggableBottomSheet from '@/components/ui/DraggableBottomSheet.vue'

const route = useRoute()
const game = computed(() => route.params.game || 'ws')

const globalSearchStore = useGlobalSearchStore()
const uiStore = useUIStore()
const deckStore = useDeckStore()
const cardListRef = ref(null)
const headerRef = ref(null)
const { isFilterOpen, isTableModeActive, isCardDeckOpen, isPerformanceMode } = storeToRefs(uiStore)
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)
const { searchCountDetails, hasActiveFilters, searchResults } = storeToRefs(globalSearchStore)
const rawHeaderHeight = ref(0)

const sheetContent = ref(null)
const { smAndUp, lgAndUp } = useDisplay()

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
  globalSearchStore.initialize(game.value)
})

watch(game, (newGame) => {
  globalSearchStore.initialize(newGame)
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

const storageKey = computed(() => `globalSearchViewState_${game.value}`)

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
</style>
