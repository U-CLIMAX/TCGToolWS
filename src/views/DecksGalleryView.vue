<template>
  <v-container fluid class="h-100 pa-0 d-flex flex-column">
    <v-navigation-drawer
      v-model="drawer"
      location="right"
      temporary
      :width="drawerWidth"
      :class="{
        'glass-sheet--low': hasBackgroundImage,
        'rounded-3md mt-7 mb-3 h-auto': smAndUp,
        'mr-4': drawer && smAndUp,
      }"
      touchless
    >
      <ShareDeckDetailView
        v-if="selectedDeckKey"
        :key="selectedDeckKey"
        :deck-key="selectedDeckKey"
        :embedded="true"
        @close="drawer = false"
      />
    </v-navigation-drawer>

    <v-infinite-scroll
      ref="infiniteScrollRef"
      :key="scrollKey"
      class="themed-scrollbar py-4"
      :style="scrollStyle"
      :onLoad="loadMore"
      :empty-text="''"
    >
      <v-container class="pa-0" :class="{ 'mt-3': smAndUp }">
        <div class="d-flex justify-center px-3">
          <v-row class="w-100" style="max-width: 1280px">
            <v-col cols="12">
              <v-sheet
                class="search-container w-100 pa-4 pa-sm-5"
                :class="{ 'glass-sheet': hasBackgroundImage }"
                rounded="xl"
                elevation="2"
              >
                <div
                  class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center mb-5 ga-3"
                >
                  <div class="d-flex align-center ga-3">
                    <v-icon icon="mdi-view-grid-outline" color="primary" size="32"></v-icon>
                    <div>
                      <div class="text-h6 font-weight-bold" style="line-height: 1.2">卡组广场</div>
                      <div class="text-caption text-medium-emphasis d-none d-sm-block">
                        浏览并搜索玩家分享的热门卡组
                      </div>
                    </div>
                  </div>

                  <InsetTabs
                    v-model="localFilters.source"
                    :options="sourceOptions"
                    color="primary"
                    @update:model-value="handleSearch"
                  >
                    <template #tab-item="{ option }">
                      <v-icon
                        :icon="option.value === 'mine' ? 'mdi-account-star' : 'mdi-earth'"
                        start
                      ></v-icon>
                      {{ option.title }}
                    </template>
                  </InsetTabs>
                </div>

                <v-row dense class="align-center">
                  <!-- 遊戲種類選擇 -->
                  <v-col cols="12" class="mb-2">
                    <InsetTabs
                      v-model="localFilters.gameType"
                      :options="GAME_TYPE_OPTIONS"
                      :color="localFilters.gameType === 'ws' ? 'primary' : 'ws-rose'"
                      @update:model-value="onGameTypeChange"
                    />
                  </v-col>

                  <!-- 系列選擇 -->
                  <v-col cols="12" sm="6">
                    <v-autocomplete
                      v-model="localFilters.seriesId"
                      :items="galleryStore.seriesOptions"
                      item-title="title"
                      item-value="value"
                      label="选择系列"
                      variant="solo-filled"
                      flat
                      rounded="pill"
                      density="comfortable"
                      hide-details
                      clearable
                      :menu-props="uiStore.menuProps"
                    />
                  </v-col>

                  <!-- 排序選擇 -->
                  <v-col cols="12" sm="3">
                    <v-select
                      v-model="localFilters.sort"
                      :items="sortOptions"
                      item-title="title"
                      item-value="value"
                      variant="solo-filled"
                      flat
                      rounded="pill"
                      density="comfortable"
                      hide-details
                      prepend-inner-icon="mdi-sort"
                      :menu-props="uiStore.menuProps"
                    />
                  </v-col>

                  <!-- 篩選操作按鈕 -->
                  <v-col cols="12" sm="3" class="d-flex ga-2">
                    <v-btn
                      variant="tonal"
                      rounded="pill"
                      color="grey-btn"
                      class="flex-grow-1"
                      height="48"
                      @click="resetFilters"
                    >
                      重置
                    </v-btn>
                    <v-btn
                      color="secondary"
                      variant="flat"
                      rounded="pill"
                      class="flex-grow-1"
                      height="48"
                      @click="handleSearch"
                    >
                      搜索
                    </v-btn>
                  </v-col>
                </v-row>
              </v-sheet>
            </v-col>
          </v-row>
        </div>
      </v-container>

      <v-container class="pt-4 px-3" :class="{ 'mb-10': !smAndUp }">
        <div v-if="galleryStore.decks.length > 0 && galleryStore.filters.source === 'mine'">
          <div class="group-header">
            <div class="d-flex align-center ga-2">
              <v-icon :icon="DeckGalleryIcon" size="24"></v-icon>
              <span>
                {{ galleryStore.userDeckCount }} /
                {{ maxDecks === Infinity ? '∞' : maxDecks }}
              </span>
              <span
                v-if="maxDecks !== Infinity && deckCount >= maxDecks"
                class="text-error font-weight-bold"
              >
                已达上限
              </span>
            </div>
          </div>
        </div>

        <div
          v-if="galleryStore.decks.length === 0 && !galleryStore.isLoading"
          class="text-center text-medium-emphasis mt-10"
        >
          暂无分享卡组
        </div>

        <div v-else class="gallery-grid-container">
          <LazyCardWrapper v-for="item in galleryStore.decks" :key="item.key">
            <DecksGalleryItem :deck="item" @delete="handleDelete" @select="handleSelectDeck" />
          </LazyCardWrapper>
        </div>
      </v-container>

      <template v-slot:loading>
        <div class="d-flex justify-center my-4 w-100">
          <v-progress-circular indeterminate color="primary" />
        </div>
      </template>
    </v-infinite-scroll>

    <BackToTopButton :scroll-container="scrollContainer" />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useDecksGalleryStore } from '@/stores/decksGallery'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import LazyCardWrapper from '@/components/common/LazyCardWrapper.vue'
import DecksGalleryItem from '@/components/deck/DecksGalleryItem.vue'
import ShareDeckDetailView from '@/views/ShareDeckDetailView.vue'
import InsetTabs from '@/components/ui/InsetTabs.vue'
import BackToTopButton from '@/components/ui/BackToTopButton.vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { useDisplay } from 'vuetify'
import { GAME_TYPE_OPTIONS } from '@/maps/series-map'

import DeckGalleryIcon from '@/assets/ui/deck-gallery.svg'

const { triggerSnackbar } = useSnackbar()
const galleryStore = useDecksGalleryStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
const { smAndUp, width } = useDisplay()

const infiniteScrollRef = ref(null)
const scrollContainer = ref(null)
const scrollKey = ref(0)
const drawer = ref(false)
const selectedDeckKey = ref(null)

const drawerWidth = computed(() => {
  return !smAndUp.value ? '1000' : width.value * 0.45
})

const scrollStyle = computed(() => {
  const marginTop = smAndUp.value ? '50px' : '0'
  return {
    '--sb-margin-top': '27px',
    'marginTop': marginTop,
    'height': `calc(100% - ${marginTop})`,
  }
})

const maxDecks = computed(() => (authStore.userRole === 0 ? 15 : Infinity))

const sourceOptions = computed(() => {
  const options = [{ title: '全部卡组', value: 'all' }]
  if (authStore.isAuthenticated) {
    options.push({ title: '我的分享', value: 'mine' })
  }
  return options
})

const sortOptions = [
  { title: '时间从新到旧', value: 'newest' },
  { title: '时间从旧到新', value: 'oldest' },
  { title: '评分从高到低', value: 'rating_desc' },
  { title: '评分从低到高', value: 'rating_asc' },
]

const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const localFilters = ref({
  source: 'all',
  gameType: 'ws',
  seriesId: null,
  sort: 'newest',
})

const onGameTypeChange = () => {
  localFilters.value.seriesId = null
  handleSearch()
}

const handleSearch = async () => {
  galleryStore.filters.source = localFilters.value.source
  galleryStore.filters.gameType = localFilters.value.gameType
  galleryStore.filters.seriesId = localFilters.value.seriesId
  galleryStore.filters.sort = localFilters.value.sort

  try {
    await galleryStore.fetchDecks()
    scrollKey.value++
  } catch (error) {
    triggerSnackbar(error.message || '搜索失败', 'error')
  }
}

const resetFilters = async () => {
  localFilters.value.gameType = 'ws'
  localFilters.value.seriesId = null
  localFilters.value.sort = 'newest'
  galleryStore.filters.source = localFilters.value.source
  galleryStore.filters.gameType = localFilters.value.gameType
  galleryStore.filters.seriesId = localFilters.value.seriesId
  galleryStore.filters.sort = localFilters.value.sort

  try {
    await galleryStore.fetchDecks()
    scrollKey.value++
  } catch (error) {
    triggerSnackbar(error.message || '搜索失败', 'error')
  }
}

const handleSelectDeck = (key) => {
  selectedDeckKey.value = key
  drawer.value = true
}

const handleDelete = async (key) => {
  try {
    await galleryStore.deleteDeck(key)
    triggerSnackbar('已取消分享', 'success')
  } catch (error) {
    triggerSnackbar(error.message || '操作失败', 'error')
  }
}

const loadMore = async ({ done }) => {
  if (galleryStore.pagination.hasMore) {
    try {
      await galleryStore.fetchDecks(true)
      done('ok')
    } catch (err) {
      triggerSnackbar(err.message || '加载更多失败', 'error')
      done('error')
    }
  } else {
    done('empty')
  }
}

onBeforeRouteLeave((to, from, next) => {
  if (smAndUp.value) next()

  if (uiStore.isCardDetailModalOpen) {
    uiStore.isCardDetailModalOpen = false
    next(false)
  } else if (drawer.value) {
    drawer.value = false
    next(false)
  } else {
    next()
  }
})

onMounted(async () => {
  // Initialize local filters from store
  localFilters.value.source = galleryStore.filters.source
  localFilters.value.gameType = galleryStore.filters.gameType
  localFilters.value.seriesId = galleryStore.filters.seriesId
  localFilters.value.sort = galleryStore.filters.sort

  try {
    await galleryStore.fetchDecks()
  } catch (error) {
    triggerSnackbar(error.message || '加载失败', 'error')
  }

  nextTick(() => {
    scrollContainer.value = infiniteScrollRef.value?.$el
  })
})

watch(scrollKey, () => {
  nextTick(() => {
    scrollContainer.value = infiniteScrollRef.value?.$el
  })
})
</script>

<style scoped>
.search-container {
  padding: 16px;
}

.gallery-grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

@media (max-width: 740px) {
  .gallery-grid-container {
    gap: 12px;
    grid-template-columns: 1fr;
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
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.875rem;
}
</style>
