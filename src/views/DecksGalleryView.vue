<template>
  <v-container fluid class="h-100 pa-0">
    <v-navigation-drawer
      v-model="drawer"
      location="right"
      temporary
      :width="drawerWidth"
      :class="{ 'glass-sheet': hasBackgroundImage }"
      touchless
    >
      <ShareDeckDetailView
        v-if="selectedDeckKey"
        :deck-key="selectedDeckKey"
        :embedded="true"
        @close="drawer = false"
      />
    </v-navigation-drawer>

    <v-infinite-scroll
      ref="infiniteScrollRef"
      :key="scrollKey"
      class="h-100 themed-scrollbar"
      :onLoad="loadMore"
      :empty-text="''"
    >
      <v-container class="pa-0">
        <div class="d-flex justify-center px-3">
          <v-row class="w-100" style="max-width: 1280px">
            <v-col cols="12">
              <v-sheet
                class="search-container w-100"
                :class="{ 'glass-sheet': hasBackgroundImage }"
                rounded="lg"
                elevation="2"
              >
                <div class="d-flex justify-space-between align-center mb-3 ga-2">
                  <div class="text-h6 font-weight-bold">卡组广场</div>
                  <div class="text-caption text-grey-darken-1 d-none d-sm-block">
                    在此浏览玩家分享的热门卡组。点击卡组查看详情。
                  </div>
                </div>

                <v-divider class="mb-3"></v-divider>

                <!-- 來源選擇 -->
                <v-row dense>
                  <v-col cols="12" class="mb-2">
                    <v-btn-toggle
                      v-model="localFilters.source"
                      mandatory
                      color="primary"
                      variant="outlined"
                      divided
                      class="w-100"
                      density="compact"
                      @update:model-value="handleSearch"
                    >
                      <v-btn
                        v-for="opt in sourceOptions"
                        :key="opt.value"
                        :value="opt.value"
                        class="flex-1-1"
                        :prepend-icon="opt.value === 'mine' ? 'mdi-account-star' : 'mdi-earth'"
                      >
                        {{ opt.title }}
                      </v-btn>
                    </v-btn-toggle>
                  </v-col>
                </v-row>

                <!-- 篩選條件區域 -->
                <v-card variant="outlined" class="mt-3 pa-3" rounded="lg">
                  <v-row dense>
                    <!-- 系列選擇 -->
                    <v-col cols="12" sm="8">
                      <v-autocomplete
                        v-model="localFilters.seriesId"
                        :items="galleryStore.seriesOptions"
                        item-title="title"
                        item-value="value"
                        label="选择系列"
                        variant="outlined"
                        density="compact"
                        hide-details
                        clearable
                        :menu-props="uiStore.menuProps"
                      />
                    </v-col>

                    <!-- 排序選擇 -->
                    <v-col cols="12" sm="4">
                      <v-select
                        v-model="localFilters.sort"
                        :items="sortOptions"
                        item-title="title"
                        item-value="value"
                        label="排序"
                        variant="outlined"
                        density="compact"
                        hide-details
                        prepend-inner-icon="mdi-sort"
                        :menu-props="uiStore.menuProps"
                      />
                    </v-col>
                  </v-row>

                  <!-- 篩選操作按鈕 -->
                  <div class="d-flex justify-end ga-2 mt-3">
                    <v-btn variant="flat" color="grey" @click="resetFilters">重置</v-btn>
                    <v-btn color="secondary" variant="flat" @click="handleSearch"> 搜索 </v-btn>
                  </div>
                </v-card>
              </v-sheet>
            </v-col>
          </v-row>
        </div>
      </v-container>

      <v-container class="pt-4 px-3">
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
          class="text-center text-grey mt-10"
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
import { useDecksGalleryStore } from '@/stores/decksGallery'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import LazyCardWrapper from '@/components/common/LazyCardWrapper.vue'
import DecksGalleryItem from '@/components/deck/DecksGalleryItem.vue'
import ShareDeckDetailView from '@/views/ShareDeckDetailView.vue'
import BackToTopButton from '@/components/ui/BackToTopButton.vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { useDisplay } from 'vuetify'

import DeckGalleryIcon from '@/assets/ui/deck-gallery.svg'

const { triggerSnackbar } = useSnackbar()
const galleryStore = useDecksGalleryStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
const { smAndDown, width } = useDisplay()

const infiniteScrollRef = ref(null)
const scrollContainer = ref(null)
const scrollKey = ref(0)
const drawer = ref(false)
const selectedDeckKey = ref(null)

const drawerWidth = computed(() => {
  return smAndDown.value ? '1000' : width.value * 0.45
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
]

const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const localFilters = ref({
  source: 'all',
  seriesId: null,
  sort: 'newest',
})

const handleSearch = async () => {
  galleryStore.filters.source = localFilters.value.source
  galleryStore.filters.seriesId = localFilters.value.seriesId
  galleryStore.filters.sort = localFilters.value.sort

  try {
    await galleryStore.fetchDecks()
    scrollKey.value++
  } catch (error) {
    triggerSnackbar(error.message || '搜索失败', 'error')
  }
}

const resetFilters = () => {
  localFilters.value.source = 'all'
  localFilters.value.seriesId = null
  localFilters.value.sort = 'newest'
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

onMounted(async () => {
  // Initialize local filters from store
  localFilters.value.source = galleryStore.filters.source
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
