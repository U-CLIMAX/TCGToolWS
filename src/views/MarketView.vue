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
        <div class="d-flex justify-center pt-3 px-3">
          <v-sheet
            class="search-container"
            :class="{ 'glass-sheet': hasBackgroundImage }"
            rounded="lg"
            elevation="2"
          >
            <!-- 篩選器區域 -->
            <v-row dense>
              <!-- 來源選擇 -->
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="marketStore.filters.source"
                  :items="sourceOptions"
                  item-title="title"
                  item-value="value"
                  label="商品来源"
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-store-outline"
                  :menu-props="uiStore.menuProps"
                />
              </v-col>

              <!-- 系列選擇 -->
              <v-col cols="12" sm="6" md="3">
                <v-autocomplete
                  v-model="marketStore.filters.seriesId"
                  :items="seriesOptions"
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
                  v-model="marketStore.filters.climaxType"
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
                        <v-img :src="item.raw.icon" width="24" height="24" class="mr-2" contain />
                      </template>
                    </v-list-item>
                  </template>
                  <template #chip="{ item }">
                    <v-chip class="ma-1" size="small">
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
                  v-model="marketStore.filters.tag"
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

            <div class="d-flex align-center mt-4">
              <v-btn
                v-if="authStore.isAuthenticated"
                class="mr-auto"
                color="primary"
                prepend-icon="mdi-plus"
                @click="openCreateDialog"
              >
                发布商品
              </v-btn>
              <div class="ga-2 d-flex ml-auto">
                <v-btn variant="text" color="grey" @click="resetFilters">重置</v-btn>
                <v-btn
                  color="secondary"
                  variant="tonal"
                  @click="handleSearch"
                  :loading="marketStore.isLoading"
                  :disabled="
                    marketStore.filters.seriesId === null && marketStore.filters.source === 'all'
                  "
                >
                  搜索
                </v-btn>
              </div>
            </div>
          </v-sheet>
        </div>
      </v-container>

      <v-container class="pt-4 px-3">
        <div
          v-if="marketStore.listings.length === 0 && !marketStore.isLoading"
          class="text-center text-grey mt-10"
        >
          暂无商品
        </div>

        <v-row dense v-else>
          <v-col
            v-for="item in marketStore.listings"
            :key="item.id"
            cols="6"
            sm="4"
            md="3"
            lg="2"
            xl="1"
          >
            <MarketListingItem :listing="item" />
          </v-col>
        </v-row>
      </v-container>

      <template v-slot:loading>
        <v-row justify="center" class="my-4">
          <v-progress-circular indeterminate color="primary" />
        </v-row>
      </template>
    </v-infinite-scroll>

    <BackToTopButton :scroll-container="scrollContainer" />
    <MarketCreateDialog v-model="showCreateDialog" @created="handleRefresh" />
    <AuthDialog ref="authDialog" />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useMarketStore } from '@/stores/market'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { seriesMap } from '@/maps/series-map'
import MarketCreateDialog from '@/components/market/MarketCreateDialog.vue'
import MarketListingItem from '@/components/market/MarketListingItem.vue'
import AuthDialog from '@/components/ui/AuthDialog.vue'
import BackToTopButton from '@/components/ui/BackToTopButton.vue'

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

const showCreateDialog = ref(false)
const authDialog = ref(null)
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const seriesOptions = computed(() => {
  return Object.keys(seriesMap)
    .map((key) => ({
      title: key,
      value: seriesMap[key].id,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
})

const openCreateDialog = () => {
  if (!authStore.isAuthenticated) {
    authDialog.value?.open()
    return
  }
  showCreateDialog.value = true
}

const handleSearch = () => {
  marketStore.fetchListings()
  scrollKey.value++
}

const handleRefresh = async () => {
  if (marketStore.filters.source === 'all') return
  await marketStore.fetchListings()
  scrollKey.value++
}

const resetFilters = () => {
  marketStore.filters.seriesId = null
  marketStore.filters.climaxType = []
  marketStore.filters.tag = []
  marketStore.filters.source = 'all'
  handleSearch()
}

const loadMore = async ({ done }) => {
  if (marketStore.pagination.hasMore) {
    try {
      await marketStore.fetchListings(true)
      done('ok')
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      done('error')
    }
  } else {
    done('empty')
  }
}

onMounted(() => {
  // 初始化加載
  marketStore.fetchListings()
  // 確保 scrollContainer 在組件掛載後更新 (因為使用了 key，可能需要 nextTick)
  nextTick(() => {
    scrollContainer.value = infiniteScrollRef.value?.$el
  })
})

// 當 scrollKey 變化時重新獲取 scrollContainer
watch(scrollKey, () => {
  nextTick(() => {
    scrollContainer.value = infiniteScrollRef.value?.$el
  })
})
</script>

<style scoped>
.search-container {
  width: 100%;
  max-width: 900px;
  padding: 16px;
}

.gap-2 {
  gap: 8px;
}
</style>
