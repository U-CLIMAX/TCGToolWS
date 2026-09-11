<template>
  <v-container fluid class="h-100 pa-0 d-flex flex-column">
    <v-infinite-scroll
      ref="infiniteScrollRef"
      class="themed-scrollbar py-4"
      :style="scrollStyle"
      :onLoad="loadMore"
      :empty-text="''"
    >
      <!-- Header Area (Search & Filters) -->
      <v-container class="pa-0" :class="{ 'mt-3': smAndUp }">
        <div class="d-flex justify-center px-3">
          <v-sheet
            class="search-container w-100 pa-4 pa-sm-5"
            :class="{ 'glass-sheet': hasBackgroundImage }"
            rounded="xl"
            elevation="2"
          >
            <!-- 標題區域 -->
            <div
              class="d-flex flex-column flex-sm-row justify-space-between align-start align-sm-center mb-4 ga-3"
            >
              <div class="d-flex align-center ga-3">
                <v-icon :icon="DeckIcon" color="primary" size="32" />
                <div>
                  <div class="d-flex align-center ga-2" style="line-height: 1.2">
                    <span class="text-h6 font-weight-bold">我的卡组</span>
                    <v-chip
                      v-if="isTauri && !authStore.isOnline"
                      size="x-small"
                      color="warning"
                      variant="tonal"
                      label
                      prepend-icon="i-mdi:cloud-off-outline"
                      class="font-weight-medium rounded-pill"
                    >
                      离线模式
                    </v-chip>
                  </div>
                  <div class="text-caption font-weight-light">管理并搜索您收藏的卡组</div>
                </div>
              </div>

              <!-- 卡組來源切換 (Tauri 客戶端在線且已登入時提供切換) -->
              <div
                v-if="isTauri && authStore.isAuthenticated && authStore.isOnline"
                class="d-flex ga-2 align-center flex-sm-grow-0 flex-grow-1 w-100 w-sm-auto"
              >
                <InsetTabs v-model="deckSourceMode" :options="deckSourceOptions">
                  <template #tab-item="{ option }">
                    <v-icon
                      :icon="
                        option.value === 'cloud' ? 'i-mdi:cloud-outline' : 'i-mdi:folder-outline'
                      "
                      start
                    />
                    {{ option.title }}
                  </template>
                </InsetTabs>
              </div>
            </div>

            <!-- 搜尋與篩選區域 -->
            <v-row dense>
              <!-- 0. 遊戲種類選擇 -->
              <v-col cols="12">
                <InsetTabs
                  v-model="selectedGameType"
                  :options="GAME_TYPE_OPTIONS"
                  :color="GAME_TYPE_OPTIONS.find((o) => o.value === selectedGameType)?.color"
                  @update:model-value="onGameTypeChange"
                />
              </v-col>
            </v-row>

            <v-row dense>
              <v-col cols="12" sm="7">
                <v-text-field
                  v-model="deckNameSearchTerm"
                  label="搜索卡组名称"
                  variant="solo-filled"
                  flat
                  rounded="pill"
                  density="comfortable"
                  append-inner-icon="i-mdi:magnify"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="5">
                <v-autocomplete
                  v-model="selectedSeries"
                  :items="availableSeriesOptions"
                  item-title="title"
                  item-value="value"
                  label="筛选系列"
                  variant="solo-filled"
                  flat
                  rounded="pill"
                  density="comfortable"
                  hide-details
                  clearable
                  :menu-props="uiStore.menuProps"
                  @update:model-value="handleSearch"
                />
              </v-col>
            </v-row>

            <v-row dense class="mb-2">
              <v-col cols="12">
                <v-autocomplete
                  v-model="selectedTags"
                  :items="allAvailableTags"
                  label="筛选标签"
                  multiple
                  chips
                  closable-chips
                  variant="solo-filled"
                  flat
                  rounded="pill"
                  density="comfortable"
                  hide-details
                  clearable
                  :menu-props="uiStore.menuProps"
                  @update:model-value="handleSearch"
                />
              </v-col>
            </v-row>

            <v-btn
              v-if="!isTauri || authStore.isOnline"
              block
              variant="flat"
              rounded="pill"
              color="primary"
              prepend-icon="i-mdi:import"
              height="44"
              class="mt-2"
              @click="showDeckCodeDialog = true"
            >
              通过卡组代码查看
            </v-btn>
          </v-sheet>
        </div>
      </v-container>

      <!-- Code Dialog -->
      <v-dialog v-model="showDeckCodeDialog" max-width="600px">
        <v-card class="rounded-2lg pa-2">
          <v-card-title>输入卡组代码</v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="deckCodeSource"
                  :items="sourceOptions"
                  item-title="title"
                  item-value="value"
                  label="代码来源"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="deckCode"
                  label="卡组代码"
                  variant="outlined"
                  density="compact"
                  hide-details
                  autofocus
                  @keydown.enter="navigateToSharedDeck"
                />
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions class="pr-5">
            <v-spacer />
            <v-btn variant="text" @click="showDeckCodeDialog = false">取消</v-btn>
            <v-btn
              color="primary"
              variant="tonal"
              :disabled="!deckCode"
              @click="navigateToSharedDeck"
              >确定</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Decks Grid List Area -->
      <v-container class="pa-0" :class="{ 'mb-12': !smAndUp }">
        <div v-if="initialLoadingComplete || isLocalMode">
          <div class="group-header">
            <div class="d-flex align-center ga-4 flex-wrap">
              <div class="d-flex align-center ga-2">
                <v-icon :icon="DeckIcon" size="24" />
                <span>{{ currentDeckCount }} / {{ maxDecks === Infinity ? '∞' : maxDecks }}</span>
                <span
                  v-if="maxDecks !== Infinity && currentDeckCount >= maxDecks"
                  class="text-error font-weight-bold"
                >
                  已达上限
                </span>
              </div>

              <div class="d-flex align-center ga-3 text-caption text-medium-emphasis">
                <div v-for="opt in GAME_TYPE_OPTIONS" :key="opt.value" class="d-flex align-center">
                  <span class="mr-1">{{ opt.title }}:</span>
                  <span class="font-weight-bold text-high-emphasis">
                    {{ currentGameTypeCounts[opt.value] || 0 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="isTouch"
            class="text-caption font-weight-medium ml-3 mt-1 mb-2 d-flex align-center ga-1"
          >
            <v-icon icon="i-mdi:gesture-tap-hold" size="14" />
            <span>提示：长按卡组可开启管理功能</span>
          </div>
          <div v-if="displayedDecks.length > 0" class="v-row ma-1 mt-0">
            <v-col
              v-for="item in displayedDecks"
              :key="item.key"
              class="pa-2"
              cols="4"
              xs="6"
              sm="3"
              md="2"
              xl="1"
            >
              <LazyCardWrapper>
                <DeckCard
                  :deck="item.deck"
                  :deckKey="item.key"
                  :is-editing="item.isEditing"
                  :is-touch="isTouch"
                  :sm-and-down="smAndDown"
                  :all-existing-tags="allAvailableTags"
                  :on-delete="handleDeleteDeck"
                  :on-save-tags="handleSaveTags"
                  :on-upload-cloud="handleUploadCloud"
                />
              </LazyCardWrapper>
            </v-col>
          </div>
          <div v-else-if="!deckStore.isLoading" class="text-center text-medium-emphasis mt-10">
            暂无卡组
          </div>
        </div>
      </v-container>
    </v-infinite-scroll>

    <BackToTopButton :scroll-container="scrollContainer" />
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router'
import { useDeckStore } from '@/stores/deck'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'
import { useDevice } from '@/composables/useDevice'
import { debounceRef } from '@/composables/useDebounceRef'
import { useInfiniteScrollState } from '@/composables/useInfiniteScrollState.js'
import { seriesMap, GAME_TYPE_OPTIONS } from '@/maps/series-map'
import { isTauri } from '@/utils/isTauri'

import DeckIcon from '@/assets/ui/deck.svg'

definePage({
  name: 'Decks',
  meta: { group: 'decks' },
})

const router = useRouter()
const deckStore = useDeckStore()
const authStore = useAuthStore()
const uiStore = useUIStore()
const { triggerSnackbar } = useSnackbar()
const { smAndUp, smAndDown } = useDisplay()
const { isTouch } = useDevice()

const infiniteScrollRef = ref(null)
const scrollContainer = ref(null)

const scrollStyle = computed(() => {
  const marginTop = smAndUp.value ? '50px' : '0'
  return {
    '--sb-margin-top': '27px',
    'marginTop': marginTop,
    'height': `calc(100% - ${marginTop})`,
  }
})

const localBatchLimit = ref(24)
const deckSourceMode = ref(
  !isTauri ? 'cloud' : authStore.isAuthenticated && authStore.isOnline ? 'cloud' : 'local'
)
const isLocalMode = computed(() => isTauri && deckSourceMode.value === 'local')

const deckSourceOptions = computed(() => [
  {
    title: `云端卡组 (${deckStore.meta.totalCount || 0})`,
    value: 'cloud',
  },
  {
    title: `本地卡组 (${deckStore.localDecksList.length})`,
    value: 'local',
  },
])

watch([() => authStore.isAuthenticated, () => authStore.isOnline], ([isAuth, isOnline]) => {
  if (isTauri) {
    if (!isAuth || !isOnline) {
      deckSourceMode.value = 'local'
    }
  } else {
    deckSourceMode.value = 'cloud'
  }
})

const handleDeleteDeck = async (key) => {
  uiStore.setLoading(true)
  try {
    if (key === 'local') {
      deckStore.clearDeck()
    } else if (deckStore.localDecks[key]) {
      deckStore.deleteLocalDeck(key)
    } else {
      await deckStore.deleteDeck(key)
    }
    triggerSnackbar('卡组已删除', 'success')
  } catch (error) {
    triggerSnackbar(error.message || '删除失败', 'error')
    throw error
  } finally {
    uiStore.setLoading(false)
  }
}

const handleUploadCloud = async (key) => {
  if (!authStore.isOnline) {
    triggerSnackbar('网络连接不可用，请检查网络状态', 'warning')
    return
  }
  if (!authStore.isAuthenticated) {
    triggerSnackbar('请先登录后再上传至云端', 'warning')
    return
  }
  uiStore.setLoading(true)
  try {
    await deckStore.uploadLocalDeckToCloud(key)
    triggerSnackbar('卡组已成功同步至云端！', 'success')
  } catch (err) {
    triggerSnackbar(err.message || '上传失败', 'error')
  } finally {
    uiStore.setLoading(false)
  }
}

const handleSaveTags = async (key, tags) => {
  try {
    if (deckStore.localDecks[key]) {
      deckStore.updateLocalDeckTags(key, tags)
    } else {
      await deckStore.updateDeckTags(key, tags)
    }
    triggerSnackbar('标签更新成功！', 'success')
  } catch (error) {
    triggerSnackbar(error.message || '保存失败', 'error')
    throw error
  }
}

if (deckStore.shouldResetView) {
  uiStore.setLoading(true)
  deckStore.decks = []
}

const deckCode = ref('')
const deckNameSearchTerm = debounceRef(
  deckStore.shouldResetView ? '' : deckStore.filters.search,
  300
)
const selectedGameType = ref(
  deckStore.shouldResetView && deckStore.pendingGameType
    ? deckStore.pendingGameType
    : deckStore.filters.gameType
)
const selectedSeries = ref(deckStore.shouldResetView ? null : deckStore.filters.series)
const selectedTags = ref(deckStore.shouldResetView ? [] : deckStore.filters.tags)

const initialLoadingComplete = ref(!deckStore.shouldResetView && deckStore.decks.length > 0)
const showDeckCodeDialog = ref(false)
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const storageKey = computed(() => 'decksViewState')

const handleSearch = async () => {
  localBatchLimit.value = 24
  deckStore.filters.search = deckNameSearchTerm.value
  deckStore.filters.gameType = selectedGameType.value
  deckStore.filters.series = selectedSeries.value
  deckStore.filters.tags = selectedTags.value

  sessionStorage.removeItem(storageKey.value)

  if (deckSourceMode.value === 'cloud' && authStore.isAuthenticated && authStore.isOnline) {
    try {
      await deckStore.fetchDecks()
    } catch (error) {
      triggerSnackbar(error.message || '搜索失败', 'error')
    }
  }

  nextTick(() => {
    infiniteScrollRef.value?.reset()
    infiniteScrollRef.value?.$el.scrollTo({ top: 0, behavior: 'instant' })
  })
}

let isResetting = false

// Watch debounced search term to trigger search
watch(deckNameSearchTerm, () => {
  if (isResetting) return
  handleSearch()
})

const onGameTypeChange = () => {
  localBatchLimit.value = 24
  deckNameSearchTerm.value = ''
  selectedSeries.value = null
  selectedTags.value = []
  handleSearch()
}

const localDecksSummary = computed(() => {
  const seriesCounts = {}
  const gameTypeCounts = {}
  const tagSet = new Set()

  for (const deck of deckStore.localDecksList) {
    if (deck.seriesId) {
      seriesCounts[deck.seriesId] = (seriesCounts[deck.seriesId] || 0) + 1
    }
    const gt = deck.game_type || 'ws'
    gameTypeCounts[gt] = (gameTypeCounts[gt] || 0) + 1
    if (Array.isArray(deck.tags)) {
      deck.tags.forEach((t) => tagSet.add(t))
    }
  }

  return {
    seriesCounts,
    gameTypeCounts,
    tags: Array.from(tagSet),
  }
})

const allAvailableTags = computed(() => {
  return isLocalMode.value ? localDecksSummary.value.tags : deckStore.meta.allTags || []
})

// 卡組代碼來源
const deckCodeSource = ref('uclimax') // 默漸選擇 U CLIMAX
const sourceOptions = [
  {
    title: 'U CLIMAX',
    value: 'uclimax',
    routeName: 'ShareDeckDetail',
  },
  {
    title: 'DeckLog JP',
    value: 'decklog',
    routeName: 'DeckLog',
  },
]

// 計算可用的系列選項並包含數量
const availableSeriesOptions = computed(() => {
  const counts = isLocalMode.value
    ? localDecksSummary.value.seriesCounts
    : deckStore.meta.seriesCounts || {}
  const options = []

  for (const [seriesId, count] of Object.entries(counts)) {
    const info = seriesMap[seriesId]
    if (info && (!selectedGameType.value || info.game === selectedGameType.value)) {
      options.push({
        title: `${info.name.replace('[cn]', '')} (${count})`,
        value: seriesId,
      })
    }
  }

  return options.sort((a, b) => a.title.localeCompare(b.title))
})

const currentDeckCount = computed(() => {
  if (isLocalMode.value) {
    return deckStore.localDecksList.length
  }
  return deckStore.meta.totalCount || 0
})

const currentGameTypeCounts = computed(() => {
  if (isLocalMode.value) {
    return localDecksSummary.value.gameTypeCounts
  }
  return deckStore.meta.gameTypeCounts || {}
})

const maxDecks = computed(() => {
  if (isLocalMode.value) return Infinity
  return authStore.userRole === 0 ? 15 : Infinity
})

const navigateToSharedDeck = () => {
  const code = deckCode.value.trim()
  if (code) {
    const selectedOption = sourceOptions.find((opt) => opt.value === deckCodeSource.value)
    router.push({
      name: selectedOption.routeName,
      params: { key: code },
    })
    showDeckCodeDialog.value = false
    deckCode.value = ''
  }
}

const localDeck = computed(() => {
  if (deckStore.totalCardCount > 0 && !deckStore.editingDeckKey) {
    const cards = Object.values(deckStore.cardsInDeck)
    return {
      name: '未命名卡组',
      cards: deckStore.cardsInDeck,
      coverCardId: deckStore.coverCardId || (cards.length > 0 ? cards[0].id : null),
      seriesId: deckStore.seriesId,
    }
  }
  return null
})

const allFilteredLocalDecks = computed(() => {
  const items = []
  // 包含当前正在编辑且未保存的临时卡组
  if (localDeck.value) {
    items.push({
      deck: localDeck.value,
      key: 'local',
      isEditing: true,
    })
  }

  // 筛选本地已保存卡组
  deckStore.localDecksList.forEach((deck) => {
    // 筛选游戏类型
    if (selectedGameType.value && deck.game_type !== selectedGameType.value) return
    // 筛选卡组名称
    if (
      deckNameSearchTerm.value &&
      !deck.name.toLowerCase().includes(deckNameSearchTerm.value.toLowerCase())
    )
      return
    // 筛选系列
    if (selectedSeries.value && deck.seriesId !== selectedSeries.value) return
    // 筛选标签
    if (selectedTags.value.length > 0 && !selectedTags.value.every((t) => deck.tags?.includes(t)))
      return

    items.push({
      deck,
      key: deck.key,
      isEditing: deck.key === deckStore.editingDeckKey,
    })
  })

  return items
})

const displayedDecks = computed(() => {
  if (isLocalMode.value) {
    return allFilteredLocalDecks.value.slice(0, localBatchLimit.value)
  }

  // 云端模式
  if (!initialLoadingComplete.value) {
    return []
  }

  const items = []
  if (localDeck.value) {
    items.push({
      deck: localDeck.value,
      key: 'local',
      isEditing: true,
    })
  }

  deckStore.decks.forEach((deck) => {
    items.push({
      deck: deck,
      key: deck.key,
      isEditing: deck.key === deckStore.editingDeckKey,
    })
  })

  return items
})

const loadMore = async ({ done }) => {
  if (isLocalMode.value) {
    if (displayedDecks.value.length < allFilteredLocalDecks.value.length) {
      localBatchLimit.value += 24
      done('ok')
    } else {
      done('empty')
    }
    return
  }

  if (!initialLoadingComplete.value || deckStore.isLoading) {
    done('ok')
    return
  }

  if (deckStore.pagination.hasMore) {
    try {
      await deckStore.fetchDecks(true)
      done('ok')
    } catch (err) {
      triggerSnackbar(err.message || '加载更多失败', 'error')
      done('error')
    }
  } else {
    done('empty')
  }
}

watch(deckSourceMode, async (newMode) => {
  localBatchLimit.value = 24
  if (newMode === 'cloud' && authStore.isAuthenticated && authStore.isOnline) {
    if (deckStore.decks.length === 0) {
      uiStore.setLoading(true)
      try {
        await deckStore.fetchDecksMeta()
        await deckStore.fetchDecks()
      } catch (err) {
        triggerSnackbar(err.message || '加载云端卡组失败', 'error')
      } finally {
        uiStore.setLoading(false)
        initialLoadingComplete.value = true
      }
    }
  }
  nextTick(() => {
    infiniteScrollRef.value?.reset()
    infiniteScrollRef.value?.$el.scrollTo({ top: 0, behavior: 'instant' })
  })
})

const resetViewAndFetch = async () => {
  isResetting = true
  deckStore.shouldResetView = false
  sessionStorage.removeItem(storageKey.value)

  deckNameSearchTerm.value = ''
  selectedSeries.value = null
  selectedTags.value = []

  if (deckStore.pendingGameType) {
    selectedGameType.value = deckStore.pendingGameType
    deckStore.pendingGameType = null
  }

  deckStore.filters.search = ''
  deckStore.filters.gameType = selectedGameType.value
  deckStore.filters.series = null
  deckStore.filters.tags = []

  uiStore.setLoading(true)
  try {
    await deckStore.fetchDecksMeta()
    await deckStore.fetchDecks()
    nextTick(() => {
      infiniteScrollRef.value?.reset()
      infiniteScrollRef.value?.$el.scrollTo({ top: 0, behavior: 'instant' })
      setTimeout(() => {
        isResetting = false
      }, 350)
    })
  } catch (error) {
    triggerSnackbar(error.message || '加载卡组失败', 'error')
    isResetting = false
  } finally {
    uiStore.setLoading(false)
    initialLoadingComplete.value = true
  }
}

watch(
  () => deckStore.shouldResetView,
  (val) => {
    if (val) {
      initialLoadingComplete.value = false
      deckStore.decks = []
      resetViewAndFetch()
    }
  }
)

useInfiniteScrollState({
  storageKey,
  scrollRef: infiniteScrollRef,
  onSave: () => {
    const scrollableElement = infiniteScrollRef.value?.$el
    if (scrollableElement) {
      return {
        itemCount: displayedDecks.value.length,
        scrollPosition: scrollableElement.scrollTop,
      }
    }
    return null
  },
  onRestore: (savedState) => {
    if (deckStore.shouldResetView) return
    nextTick(() => {
      const scrollableElement = infiniteScrollRef.value?.$el
      if (scrollableElement && savedState.scrollPosition) {
        scrollableElement.scrollTop = savedState.scrollPosition
      }
    })
  },
})

onMounted(async () => {
  const canFetchCloud = authStore.isAuthenticated && authStore.isOnline
  if (deckSourceMode.value === 'cloud' && canFetchCloud) {
    if (deckStore.shouldResetView) {
      await resetViewAndFetch()
    } else {
      const hasExistingDecks = deckStore.decks.length > 0
      if (!hasExistingDecks) {
        uiStore.setLoading(true)
      }

      try {
        await deckStore.fetchDecksMeta()
        if (!hasExistingDecks) {
          await deckStore.fetchDecks()
        }
      } catch (error) {
        triggerSnackbar(error.message, 'error')
      } finally {
        if (!hasExistingDecks) {
          uiStore.setLoading(false)
          initialLoadingComplete.value = true
        }
      }
    }
  } else {
    if (isTauri) {
      deckSourceMode.value = 'local'
    }
    initialLoadingComplete.value = true
  }

  nextTick(() => {
    scrollContainer.value = infiniteScrollRef.value?.$el
  })
})
</script>

<style scoped>
.search-container {
  width: 100%;
  max-width: 600px;
  padding: 16px;
}

.series-select {
  width: 100%; /* 手機版預設佔滿整行 */
}

@media (min-width: 600px) {
  .series-select {
    width: auto;
    min-width: 100px;
    max-width: 250px;
  }
}

.group-header {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background-color: rgba(var(--v-theme-surface), 0.7);
  backdrop-filter: blur(4px) saturate(180%);
  -webkit-backdrop-filter: blur(4px) saturate(180%); /* Safari 支援 */
  padding: 4px 12px;
  border-radius: 16px;
  margin-bottom: 4px;
  margin-top: 12px;
  margin-left: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.875rem;
}
</style>
