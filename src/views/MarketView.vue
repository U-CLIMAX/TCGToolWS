<template>
  <v-container fluid class="h-100 pa-0">
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
            <v-col cols="12" md="9">
              <v-sheet
                class="search-container w-100"
                :class="{ 'glass-sheet': hasBackgroundImage }"
                rounded="lg"
                elevation="2"
              >
                <div class="d-flex justify-space-between align-center mb-3 ga-2">
                  <div class="text-caption text-grey-darken-1">
                    本平台仅提供商品信息展示，不参与交易过程，复制链接后在相应 app
                    内打开。请务必核实卖家身份，建议通过闲鱼等担保平台完成交易。最终解释权归
                    U-CLIMAX 所有。
                  </div>
                  <v-btn
                    v-if="authStore.isAuthenticated"
                    color="primary"
                    prepend-icon="mdi-plus"
                    @click="openCreateDialog"
                    :disabled="isLimitReached"
                    elevation="0"
                  >
                    发布商品
                  </v-btn>
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
                        :prepend-icon="opt.value === 'mine' ? 'mdi-store' : 'mdi-shopping'"
                      >
                        {{ opt.title }}
                      </v-btn>
                    </v-btn-toggle>
                  </v-col>
                </v-row>

                <!-- 篩選條件區域 -->
                <v-card variant="outlined" class="mt-3 pa-3" rounded="lg">
                  <div class="text-caption text-medium-emphasis mb-3 d-flex align-center">
                    <v-icon icon="mdi-filter-variant" size="18" class="mr-1"></v-icon>
                    筛选条件
                  </div>

                  <v-row dense>
                    <!-- 排序選擇 -->
                    <v-col cols="12" sm="6" md="3">
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

                    <!-- 系列選擇 -->
                    <v-col cols="12" sm="6" md="3">
                      <v-autocomplete
                        v-model="localFilters.seriesId"
                        :items="marketStore.seriesOptions"
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

                    <!-- 潮種類選擇 -->
                    <v-col cols="12" sm="6" md="3">
                      <v-select
                        v-model="localFilters.climaxType"
                        :items="marketStore.climaxTypeOptions"
                        item-title="name"
                        item-value="value"
                        label="潮种类"
                        variant="outlined"
                        density="compact"
                        hide-details
                        clearable
                        multiple
                        chips
                        :menu-props="uiStore.menuProps"
                      >
                        <template #item="{ props, item }">
                          <v-list-item v-bind="props" :title="item.raw.name">
                            <template #prepend>
                              <v-img
                                :src="item.raw.icon"
                                width="24"
                                height="24"
                                class="mr-2"
                                contain
                              />
                            </template>
                          </v-list-item>
                        </template>
                        <template #chip="{ item }">
                          <v-chip size="small">
                            <template #prepend>
                              <v-img :src="item.raw.icon" width="16" height="16" class="mr-1" />
                            </template>
                            {{ item.raw.name }}
                          </v-chip>
                        </template>
                      </v-select>
                    </v-col>

                    <!-- 標籤選擇 -->
                    <v-col cols="12" sm="6" md="3">
                      <v-select
                        v-model="localFilters.tag"
                        :items="marketStore.tagOptions"
                        item-title="label"
                        item-value="value"
                        label="标签"
                        multiple
                        chips
                        closable-chips
                        variant="outlined"
                        density="compact"
                        hide-details
                        clearable
                        prepend-inner-icon="mdi-tag-outline"
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

            <!-- 排行榜 -->
            <v-col cols="12" md="3">
              <v-sheet
                class="pa-3"
                :class="{ 'glass-sheet': hasBackgroundImage }"
                rounded="lg"
                elevation="2"
              >
                <div class="d-flex align-center mb-3">
                  <v-icon icon="mdi-podium" color="yellow-darken-3" class="mr-2"></v-icon>
                  <span class="font-weight-bold">热门系列 TOP 5</span>
                </div>

                <div
                  v-if="marketStore.isRankingLoading"
                  class="d-flex justify-center align-center py-4"
                >
                  <v-progress-circular indeterminate color="primary" size="32" />
                </div>

                <v-list v-else density="compact" class="bg-transparent pa-0">
                  <v-list-item
                    v-for="(item, index) in marketStore.rankingStats.top5"
                    :key="item.series_name"
                    class="px-1 mb-1 rounded"
                    link
                    @click="selectSeries(item.series_name)"
                  >
                    <template #prepend>
                      <div
                        class="text-caption font-weight-bold mr-2 text-center"
                        style="width: 20px"
                        :class="index < 3 ? 'text-primary' : 'text-grey'"
                      >
                        {{ index + 1 }}
                      </div>
                      <v-avatar size="24" rounded="0" class="mr-2">
                        <v-img
                          :src="`/series-icons/original/${item.series_name}.webp`"
                          :lazy-src="`/series-icons/blur/${item.series_name}.webp`"
                          cover
                          class="preload-img"
                        />
                      </v-avatar>
                    </template>

                    <v-list-item-title class="text-caption">
                      {{ getSeriesName(item.series_name) }}
                    </v-list-item-title>

                    <template #append>
                      <span class="text-caption text-grey-darken-1">{{ item.count }}</span>
                    </template>
                  </v-list-item>

                  <div
                    v-if="marketStore.rankingStats.top5.length === 0"
                    class="text-caption text-center text-grey-darken-1 py-4"
                  >
                    暂无数据
                  </div>
                </v-list>
                <div
                  v-if="marketStore.rankingStats.top5.length !== 0"
                  class="text-caption text-grey-darken-1 text-right"
                  style="font-size: 10px"
                >
                  更新于:
                  {{ new Date(marketStore.rankingStats.updated_at * 1000).toLocaleTimeString() }}
                </div>
              </v-sheet>
            </v-col>
          </v-row>
        </div>
      </v-container>

      <v-container class="pt-4 px-3">
        <div
          v-if="
            authStore.isAuthenticated &&
            marketStore.filters.source === 'mine' &&
            marketStore.listings.length > 0
          "
        >
          <div class="group-header">
            <div class="d-flex align-center ga-2">
              <v-icon icon="mdi-package-check" size="24"></v-icon>
              <span
                >{{ marketStore.userListingCount }} /
                {{ maxListings === Infinity ? '∞' : maxListings }}</span
              >
              <span v-if="isLimitReached" class="text-error font-weight-bold"> 已达上限 </span>
            </div>
          </div>
        </div>

        <div
          v-if="marketStore.listings.length === 0 && !marketStore.isLoading"
          class="text-center text-grey mt-10"
        >
          暂无商品
        </div>

        <div v-else class="listing-grid-container">
          <LazyCardWrapper v-for="item in marketStore.listings" :key="item.id">
            <MarketListingItem :listing="item" @edit="handleEdit" />
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
    <MarketCreateDialog
      v-model="showCreateDialog"
      :editing-listing="editingListing"
      @created="handleRefresh"
      @updated="handleRefresh"
    />
    <AuthDialog ref="authDialog" />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useMarketStore } from '@/stores/market'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import LazyCardWrapper from '@/components/common/LazyCardWrapper.vue'
import MarketCreateDialog from '@/components/market/MarketCreateDialog.vue'
import MarketListingItem from '@/components/market/MarketListingItem.vue'
import AuthDialog from '@/components/ui/AuthDialog.vue'
import BackToTopButton from '@/components/ui/BackToTopButton.vue'
import { useSnackbar } from '@/composables/useSnackbar'

const { triggerSnackbar } = useSnackbar()
const marketStore = useMarketStore()
const uiStore = useUIStore()
const authStore = useAuthStore()

const infiniteScrollRef = ref(null)
const scrollContainer = ref(null)
const scrollKey = ref(0)

const sourceOptions = computed(() => {
  const options = [{ title: '全部商品', value: 'all' }]
  if (authStore.isAuthenticated) {
    options.push({ title: '我的卖场', value: 'mine' })
  }
  return options
})

const sortOptions = [
  { title: '最新发布', value: 'newest' },
  { title: '价格从低到高', value: 'price_asc' },
  { title: '价格从高到低', value: 'price_desc' },
]

const showCreateDialog = ref(false)
const editingListing = ref(null)
const authDialog = ref(null)
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const maxListings = computed(() => {
  if (authStore.userRole === 0) return 5
  if (authStore.userRole === 1) return 50
  return Infinity
})

const isLimitReached = computed(() => {
  return maxListings.value !== Infinity && marketStore.userListingCount >= maxListings.value
})

const openCreateDialog = () => {
  if (!authStore.isAuthenticated) {
    authDialog.value?.open()
    return
  }
  editingListing.value = null
  showCreateDialog.value = true
}

const handleEdit = (listing) => {
  editingListing.value = listing
  showCreateDialog.value = true
}

const localFilters = ref({
  source: 'all',
  seriesId: null,
  climaxType: [],
  tag: [],
  sort: 'newest',
})

const handleSearch = async () => {
  marketStore.filters.source = localFilters.value.source
  marketStore.filters.seriesId = localFilters.value.seriesId
  marketStore.filters.climaxType = [...localFilters.value.climaxType]
  marketStore.filters.tag = [...localFilters.value.tag]
  marketStore.filters.sort = localFilters.value.sort

  try {
    await marketStore.fetchListings()
    scrollKey.value++
  } catch (error) {
    triggerSnackbar(error.message || '搜索失败', 'error')
  }
}

const handleRefresh = async () => {
  if (marketStore.filters.source === 'all') return
  try {
    await marketStore.fetchListings()
    scrollKey.value++
  } catch (error) {
    triggerSnackbar(error.message || '刷新失败', 'error')
  }
}

const resetFilters = () => {
  localFilters.value.source = 'all'
  localFilters.value.seriesId = null
  localFilters.value.climaxType = []
  localFilters.value.tag = []
  localFilters.value.sort = 'newest'
}

const getSeriesName = (id) => {
  return marketStore.seriesOptions.find((opt) => opt.value === id)?.title || id
}

const selectSeries = (seriesId) => {
  resetFilters()
  localFilters.value.seriesId = seriesId
  handleSearch()
}

const loadMore = async ({ done }) => {
  if (marketStore.pagination.hasMore) {
    try {
      await marketStore.fetchListings(true)
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
  localFilters.value.source = marketStore.filters.source
  localFilters.value.seriesId = marketStore.filters.seriesId
  localFilters.value.climaxType = [...marketStore.filters.climaxType]
  localFilters.value.tag = [...marketStore.filters.tag]
  localFilters.value.sort = marketStore.filters.sort

  try {
    // Parallel fetch
    await Promise.all([marketStore.fetchListings(), marketStore.fetchRankingStats()])
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
  /* max-width removed to allow grid control */
  padding: 16px;
}

.gap-2 {
  gap: 8px;
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

.listing-grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

/* Slightly increase the card size on a wider screen to avoid overcrowding in a single row. */
@media (min-width: 1280px) {
  .listing-grid-container {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

@media (max-width: 740px) {
  .listing-grid-container {
    gap: 8px;
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
