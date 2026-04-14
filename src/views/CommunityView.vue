<template>
  <v-container fluid class="community-view h-100 pa-0 d-flex flex-column">
    <v-infinite-scroll
      ref="infiniteScrollRef"
      class="themed-scrollbar py-4"
      :style="scrollStyle"
      :onLoad="loadMore"
      :empty-text="''"
    >
      <!-- Header Area -->
      <v-container class="pa-0 flex-grow-0" :class="{ 'mt-3': smAndUp }">
        <div class="d-flex justify-center px-3">
          <v-row class="w-100" style="max-width: 1280px">
            <v-col cols="12">
              <div
                class="header-section d-flex align-center mb-8"
                :class="smAndUp ? 'ga-4' : 'ga-3 mb-4'"
              >
                <v-avatar
                  color="blue-lighten-4"
                  :size="smAndUp ? 77 : 56"
                  class="rounded-circle shadow-sm pa-2"
                >
                  <v-icon :icon="crowdIcon" class="w-100 h-100" />
                </v-avatar>
                <div>
                  <h1 :class="smAndUp ? 'text-h4' : 'text-h5'" class="font-weight-bold mb-1">
                    WS 玩家社群查询
                  </h1>
                  <p :class="smAndUp ? 'text-subtitle-1' : 'text-body-2'">
                    查看 ws 玩家与店家交流群信息
                  </p>
                  <div class="text-caption text-medium-emphasis mt-n1" style="opacity: 0.8">
                    数据来源：银龙的TCG上位搬运
                  </div>
                </div>
              </div>

              <!-- Search & Filter -->
              <div class="filter-container w-100 py-4">
                <!-- Text Search -->
                <v-row class="mb-4">
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="filters.search"
                      placeholder="搜索地区或者群聊名称"
                      variant="solo"
                      flat
                      rounded="pill"
                      hide-details
                      clearable
                      @update:model-value="handleSearch"
                    >
                      <template #prepend-inner>
                        <v-icon color="primary">mdi-magnify</v-icon>
                      </template>
                    </v-text-field>
                  </v-col>
                </v-row>

                <v-row dense class="align-center ga-2">
                  <v-col cols="12" sm="5" md="3">
                    <div
                      class="d-flex align-center pa-1 border-md border-primary rounded-pill pa-2"
                    >
                      <div class="d-flex align-center px-6 flex-shrink-0 ga-2">
                        <v-icon icon="mdi-map-marker-outline" class="text-medium-emphasis" />
                        <span class="text-body-1 text-medium-emphasis">省份</span>
                      </div>

                      <v-autocomplete
                        v-model="filters.province"
                        :items="provinces"
                        label="全国"
                        variant="solo"
                        flat
                        rounded="pill"
                        density="compact"
                        hide-details
                        clearable
                        bg-color="primary"
                        :menu-props="uiStore.menuProps"
                        @update:model-value="handleProvinceChange"
                      />
                    </div>
                  </v-col>

                  <!-- City Filter -->
                  <v-col cols="12" sm="3" md="2">
                    <v-autocomplete
                      v-model="filters.city"
                      :items="cities"
                      label="城市"
                      variant="solo-filled"
                      flat
                      rounded="pill"
                      density="compact"
                      hide-details
                      clearable
                      :bg-color="
                        theme.global.current.value.dark ? 'grey-lighten-2' : 'grey-lighten-3'
                      "
                      :disabled="!filters.province"
                      :menu-props="uiStore.menuProps"
                      @update:model-value="handleCityChange"
                    />
                  </v-col>

                  <!-- District Filter -->
                  <v-col cols="12" sm="3" md="2" class="flex-grow-1">
                    <v-autocomplete
                      v-model="filters.district"
                      :items="districts"
                      label="区域"
                      variant="solo-filled"
                      flat
                      rounded="pill"
                      density="compact"
                      hide-details
                      clearable
                      :bg-color="
                        theme.global.current.value.dark ? 'grey-lighten-4' : 'grey-lighten-3'
                      "
                      :disabled="!filters.city"
                      :menu-props="uiStore.menuProps"
                      @update:model-value="handleSearch"
                    />
                  </v-col>
                </v-row>
              </div>
            </v-col>
          </v-row>
        </div>
      </v-container>

      <!-- Content Area -->
      <v-container class="pt-4 px-3">
        <v-row>
          <!-- Community Cards -->
          <v-col
            v-for="(item, index) in displayItems"
            :key="index"
            cols="12"
            sm="6"
            md="4"
            lg="3"
            :class="smAndDown ? 'py-1' : 'py-3'"
          >
            <LazyCardWrapper>
              <v-card
                class="h-100 position-relative overflow-hidden"
                :class="{ 'glass-card': hasBackgroundImage }"
                rounded="xl"
                elevation="0"
              >
                <v-icon
                  :icon="getContactIcon(item.contactType)"
                  class="bg-watermark-icon"
                  :color="theme.global.current.value.dark ? 'grey-darken-1' : 'grey-lighten-1'"
                />

                <v-card-text class="pa-4 d-flex flex-column h-100 position-relative z-1">
                  <div class="d-flex ga-2 mb-2">
                    <v-chip
                      size="x-small"
                      color="blue-lighten-5"
                      class="text-primary font-weight-bold pa-2 bg-blue-grey-lighten-5"
                      variant="flat"
                      density="compact"
                      rounded="pill"
                    >
                      {{ item.province }}
                    </v-chip>
                    <v-chip
                      v-if="item.district"
                      size="x-small"
                      color="blue-lighten-5"
                      class="text-primary font-weight-bold pa-2 bg-blue-grey-lighten-5"
                      variant="flat"
                      density="compact"
                      rounded="pill"
                    >
                      {{ item.district }}
                    </v-chip>
                  </div>

                  <div class="mb-6">
                    <div
                      class="text-subtitle-1 font-weight-bold text-medium-emphasis pr-4"
                      style="line-height: 1.2"
                    >
                      {{ item.name }}
                    </div>
                  </div>

                  <v-sheet
                    rounded="lg"
                    class="pa-2 mt-auto d-flex align-center position-relative"
                    style="
                      background-color: rgba(var(--v-theme-surface), 0.3);
                      backdrop-filter: blur(6px);
                    "
                  >
                    <div class="flex-grow-1 overflow-hidden px-1">
                      <div
                        class="text-caption text-medium-emphasis"
                        style="font-size: 10px !important"
                      >
                        {{ getContactLabel(item.contactType) }}
                      </div>
                      <div class="text-h6 text-truncate text-medium-emphasis font-DINCond">
                        {{ item.contactInfo }}
                      </div>
                    </div>
                    <v-btn
                      icon
                      color="primary"
                      size="x-small"
                      elevation="0"
                      class="rounded-circle"
                      @click="copyContact(item.contactInfo)"
                    >
                      <v-icon size="16">mdi-content-copy</v-icon>
                    </v-btn>
                  </v-sheet>
                </v-card-text>
              </v-card>
            </LazyCardWrapper>
          </v-col>
        </v-row>

        <div v-if="displayItems.length === 0" class="text-center text-medium-emphasis mt-10">
          暂无符合条件的社区信息
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
import { useDisplay, useTheme } from 'vuetify'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'
import BackToTopButton from '@/components/ui/BackToTopButton.vue'
import LazyCardWrapper from '@/components/common/LazyCardWrapper.vue'
import * as clipboard from 'clipboard-polyfill'
import rawCSV from '@/assets/community/ws.csv?raw'

import crowdIcon from '@/assets/ui/crowd.svg'

const uiStore = useUIStore()
const theme = useTheme()
const { smAndUp, smAndDown } = useDisplay()
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
  search: '',
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
    if (filters.value.search) {
      const searchLower = filters.value.search.toLowerCase()
      const matchesName = item.name.toLowerCase().includes(searchLower)
      const matchesLocation =
        item.province.toLowerCase().includes(searchLower) ||
        item.city.toLowerCase().includes(searchLower) ||
        item.district.toLowerCase().includes(searchLower)
      if (!matchesName && !matchesLocation) return false
    }
    return true
  })
})

const scrollStyle = computed(() => {
  const marginTop = !smAndDown.value ? '50px' : '0'
  return {
    '--sb-margin-top': '27px',
    'marginTop': marginTop,
    'height': `calc(100% - ${marginTop})`,
  }
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
    await new Promise((resolve) => setTimeout(resolve, 100))
    displayItems.value.push(...nextBatch)
    page.value++
    done('ok')
  } else {
    done('empty')
  }
}

// ✅ 使用 getContactIcon() 根据联系类型返回对应图标
const getContactIcon = (type) => {
  if (type.includes('QQ')) return 'mdi-qqchat'
  if (type.includes('微信')) return 'mdi-wechat'
  return 'mdi-account-box-outline'
}

// ✅ 根据联系类型返回友好标签
const getContactLabel = (type) => {
  if (type.includes('QQ')) return 'QQ 群号'
  if (type.includes('微信')) return '微信群号'
  return type
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
.v-theme--light .community-view {
  background-color: rgba(243, 241, 241, 0.7);
}

.v-theme--dark .community-view {
  background-color: rgba(44, 43, 43, 0.7);
}

.header-section {
  padding-left: 8px;
}

.filter-container {
  background-color: transparent !important;
}

.bg-watermark-icon {
  position: absolute;
  right: 4px;
  top: 2px;
  font-size: 100px !important;
  opacity: 0.7;
  pointer-events: none;
  z-index: 0;
  transform: scaleX(0.85);
}
</style>
