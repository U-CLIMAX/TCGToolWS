<template>
  <v-container fluid class="community-view h-100 pa-0 d-flex flex-column">
    <v-infinite-scroll
      ref="infiniteScrollRef"
      class="themed-scrollbar py-4"
      :style="{ '--sb-margin-top': '27px' }"
      :onLoad="loadMore"
      :empty-text="''"
    >
      <!-- Header/Filter Area -->
      <v-container class="pa-0 flex-grow-0" :class="{ 'mt-3': smAndUp }">
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
                    <v-avatar color="primary" variant="tonal" size="48" class="rounded-xl">
                      <v-icon icon="mdi-account-group-outline" size="28" />
                    </v-avatar>
                    <div>
                      <div class="text-h6 font-weight-bold" style="line-height: 1.2">
                        WS 社区查询
                      </div>
                      <div class="text-caption text-medium-emphasis d-none d-sm-block">
                        查看 WS 玩家与店家社群信息
                      </div>
                    </div>
                  </div>
                </div>

                <v-row dense class="align-center">
                  <!-- Province Filter -->
                  <v-col cols="12" sm="4">
                    <v-autocomplete
                      v-model="filters.province"
                      :items="provinces"
                      label="省份"
                      variant="solo-filled"
                      flat
                      rounded="pill"
                      density="comfortable"
                      hide-details
                      clearable
                      prepend-inner-icon="mdi-map-marker-outline"
                      :menu-props="uiStore.menuProps"
                      @update:model-value="handleProvinceChange"
                    />
                  </v-col>

                  <!-- City Filter -->
                  <v-col cols="12" sm="4">
                    <v-autocomplete
                      v-model="filters.city"
                      :items="cities"
                      label="城市"
                      variant="solo-filled"
                      flat
                      rounded="pill"
                      density="comfortable"
                      hide-details
                      clearable
                      :disabled="!filters.province"
                      prepend-inner-icon="mdi-city-variant-outline"
                      :menu-props="uiStore.menuProps"
                      @update:model-value="handleCityChange"
                    />
                  </v-col>

                  <!-- District Filter + Reset Button -->
                  <v-col cols="12" sm="4" class="d-flex ga-2">
                    <v-autocomplete
                      v-model="filters.district"
                      :items="districts"
                      label="区域"
                      variant="solo-filled"
                      flat
                      rounded="pill"
                      density="comfortable"
                      hide-details
                      clearable
                      :disabled="!filters.city"
                      prepend-inner-icon="mdi-map-outline"
                      class="flex-grow-1"
                      :menu-props="uiStore.menuProps"
                      @update:model-value="handleSearch"
                    />

                    <v-btn
                      variant="tonal"
                      rounded="pill"
                      color="grey-btn"
                      height="48"
                      width="48"
                      icon="mdi-refresh"
                      elevation="0"
                      class="flex-grow-0"
                      @click="resetFilters"
                    />
                  </v-col>
                </v-row>
              </v-sheet>
            </v-col>
          </v-row>
        </div>
      </v-container>

      <!-- Content Area -->
      <v-container class="pt-4 px-3">
        <div v-if="displayItems.length === 0" class="text-center text-medium-emphasis mt-10">
          暂无符合条件的社区信息
        </div>

        <div v-else class="community-grid">
          <LazyCardWrapper v-for="(item, index) in displayItems" :key="index">
            <v-card
              class="community-card"
              :class="{ 'glass-card': hasBackgroundImage }"
              rounded="xl"
              border
            >
              <v-card-text class="d-flex align-center pa-4">
                <v-avatar color="primary" variant="tonal" size="44" class="mr-4 rounded-lg">
                  <v-icon :icon="getContactIcon(item.contactType)" />
                </v-avatar>

                <div class="flex-grow-1 overflow-hidden">
                  <div class="d-flex align-center ga-2 mb-1">
                    <span class="text-subtitle-1 font-weight-bold text-truncate">
                      {{ item.name }}
                    </span>
                  </div>
                  <div class="text-caption text-medium-emphasis d-flex align-center ga-2">
                    <v-icon icon="mdi-map-marker" size="14" />
                    <span class="text-truncate">{{ formatLocation(item) }}</span>
                    <v-divider vertical class="mx-1" />
                    <span class="text-truncate"
                      >{{ item.contactType }}: {{ item.contactInfo }}</span
                    >
                  </div>
                </div>

                <div class="d-flex flex-column ga-1 ml-2">
                  <v-btn
                    icon="mdi-content-copy"
                    variant="tonal"
                    size="small"
                    color="primary"
                    @click="copyContact(item.contactInfo)"
                    v-tooltip:left="{ text: '复制联系方式', disabled: isTouch }"
                  />
                </div>
              </v-card-text>
            </v-card>
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { useDisplay } from 'vuetify'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'
import { useDevice } from '@/composables/useDevice'
import BackToTopButton from '@/components/ui/BackToTopButton.vue'
import LazyCardWrapper from '@/components/common/LazyCardWrapper.vue'
import * as clipboard from 'clipboard-polyfill'
import rawCSV from '@/assets/community/ws.csv?raw'

const uiStore = useUIStore()
const { smAndUp } = useDisplay()
const { isTouch } = useDevice()
const { triggerSnackbar } = useSnackbar()

const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const infiniteScrollRef = ref(null)
const scrollContainer = ref(null)

const allItems = ref([])
const displayItems = ref([])
const page = ref(1)
const pageSize = 20

const filters = ref({
  province: null,
  city: null,
  district: null,
})

// Parse CSV
const parseCSV = () => {
  const lines = rawCSV.split('\n')
  const items = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',')
    if (values.length < 6) continue

    items.push({
      province: values[0],
      city: values[1],
      district: values[2],
      name: values[3],
      contactType: values[4],
      contactInfo: values[5],
    })
  }
  allItems.value = items
}

const provinces = computed(() => {
  const set = new Set(allItems.value.map((item) => item.province).filter(Boolean))
  return Array.from(set).sort()
})

const cities = computed(() => {
  if (!filters.value.province) return []
  const set = new Set(
    allItems.value
      .filter((item) => item.province === filters.value.province)
      .map((item) => item.city)
      .filter(Boolean)
  )
  return Array.from(set).sort()
})

const districts = computed(() => {
  if (!filters.value.city) return []
  const set = new Set(
    allItems.value
      .filter(
        (item) => item.province === filters.value.province && item.city === filters.value.city
      )
      .map((item) => item.district)
      .filter(Boolean)
  )
  return Array.from(set).sort()
})

const filteredAllItems = computed(() => {
  return allItems.value.filter((item) => {
    if (filters.value.province && item.province !== filters.value.province) return false
    if (filters.value.city && item.city !== filters.value.city) return false
    if (filters.value.district && item.district !== filters.value.district) return false
    return true
  })
})

const handleSearch = () => {
  page.value = 1
  displayItems.value = filteredAllItems.value.slice(0, pageSize)
  nextTick(() => {
    infiniteScrollRef.value?.reset()
    infiniteScrollRef.value?.$el.scrollTo({ top: 0, behavior: 'instant' })
  })
}

const handleProvinceChange = () => {
  filters.value.city = null
  filters.value.district = null
  handleSearch()
}

const handleCityChange = () => {
  filters.value.district = null
  handleSearch()
}

const loadMore = async ({ done }) => {
  if (displayItems.value.length < filteredAllItems.value.length) {
    const start = page.value * pageSize
    const end = start + pageSize
    const nextBatch = filteredAllItems.value.slice(start, end)

    // Simulate small delay for smoother UI
    await new Promise((resolve) => setTimeout(resolve, 100))

    displayItems.value.push(...nextBatch)
    page.value++
    done('ok')
  } else {
    done('empty')
  }
}

const resetFilters = () => {
  filters.value = {
    province: null,
    city: null,
    district: null,
  }
  handleSearch()
}

const getContactIcon = (type) => {
  if (type.includes('QQ')) return 'mdi-qqchat'
  if (type.includes('微信')) return 'mdi-wechat'
  return 'mdi-account-box-outline'
}

const formatLocation = (item) => {
  return [item.province, item.city, item.district].filter(Boolean).join(' ')
}

const copyContact = (info) => {
  clipboard.writeText(info).then(() => {
    triggerSnackbar('已复制联系方式', 'success')
  })
}

onMounted(() => {
  parseCSV()
  handleSearch()
  nextTick(() => {
    scrollContainer.value = infiniteScrollRef.value?.$el
  })
})
</script>

<style scoped>
.search-container {
  padding: 16px;
}

.community-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.community-card {
  transition: transform 0.2s ease;
}

.community-card:hover {
  transform: translateY(-2px);
}
</style>
