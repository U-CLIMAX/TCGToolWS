<template>
  <v-container fluid class="h-100 pa-0">
    <FloatingSearchBar />
    <v-infinite-scroll
      ref="infiniteScrollRef"
      @load="load"
      empty-text=""
      class="h-100 themed-scrollbar py-4"
      :style="{ '--sb-margin-top': '27px' }"
    >
      <v-container class="py-0" :class="{ 'mt-3': smAndUp }">
        <v-sheet
          v-if="recentlyViewed.length > 0"
          :color="!hasBackgroundImage ? undefined : 'transparent'"
          rounded="xl"
          elevation="2"
          :class="{
            'glass-card': hasBackgroundImage,
            'pt-2 mb-2': !smAndDown,
            'pr-2 mx-1': smAndDown,
          }"
        >
          <div :class="smAndDown ? 'd-flex align-center overflow-hidden' : ''">
            <div
              :class="[
                smAndDown
                  ? 'd-flex flex-column align-center pr-0 pl-1 py-1'
                  : 'd-flex align-center pl-2',
              ]"
            >
              <v-icon
                class="text-medium-emphasis"
                :class="smAndDown ? 'mb-1' : 'mr-2'"
                icon="i-mdi:history"
                size="small"
              />
              <div
                class="text-subtitle-2 text-medium-emphasis font-weight-bold"
                :style="
                  smAndDown
                    ? {
                        writingMode: 'vertical-rl',
                        textOrientation: 'upright',
                        letterSpacing: '2px',
                      }
                    : {}
                "
              >
                最近查看
              </div>
            </div>

            <v-slide-group
              class="pa-2 flex-grow-1"
              :class="{ 'py-0 pl-0': smAndDown }"
              :show-arrows="smAndDown ? false : true"
            >
              <v-slide-group-item v-for="item in recentlyViewed" :key="item.id">
                <div class="ma-2" :style="{ width: smAndDown ? '100px' : '150px' }">
                  <SeriesCard :series-name="item.name" :series-data="item" :is-compact="true" />
                </div>
              </v-slide-group-item>
            </v-slide-group>
          </div>
        </v-sheet>
      </v-container>

      <v-container class="pt-0" :class="{ 'px-10 mb-12': !smAndUp }">
        <div class="d-flex flex-column flex-sm-row align-center mt-4 mb-4">
          <InsetTabs
            v-model="selectedGameType"
            :options="GAME_TYPE_OPTIONS"
            :color="GAME_TYPE_OPTIONS.find((o) => o.value === selectedGameType)?.color"
            class="mb-4 mb-sm-0"
          >
            <template #tab-item="{ option }">
              <span class="font-weight-bold">{{ option.title }}</span>
            </template>
          </InsetTabs>

          <div class="flex-grow-1 d-flex justify-end w-100 w-sm-auto">
            <v-btn
              v-for="field in [
                { label: 'Date', value: 'date' },
                { label: 'Name', value: 'name' },
              ]"
              :key="field.value"
              density="compact"
              class="rounded-pill px-4 mx-1"
              :ripple="false"
              @click="toggleSort(field.value)"
            >
              <v-icon
                v-if="seriesSortBy === field.value"
                size="large"
                :icon="
                  seriesSortAscending ? 'i-mdi:triangle-small-up' : 'i-mdi:triangle-small-down'
                "
              />
              {{ field.label }}
            </v-btn>
          </div>
        </div>

        <div class="series-grid-container">
          <div v-for="item in displayedSeries" :key="item.id" class="d-flex justify-center">
            <LazyCardWrapper>
              <SeriesCard :series-name="item.name.replace('[cn]', '')" :series-data="item" />
            </LazyCardWrapper>
          </div>
        </div>

        <template v-slot:loading>
          <v-row justify="center" class="my-4">
            <v-progress-circular indeterminate />
          </v-row>
        </template>
      </v-container>
    </v-infinite-scroll>

    <BackToTopButton :scroll-container="scrollContainer" />
  </v-container>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/ui'
import { useRecentStore } from '@/stores/recent'
import { useInfiniteScrollState } from '@/composables/useInfiniteScrollState.js'
import { seriesMap, GAME_TYPE_OPTIONS } from '@/maps/series-map.js'
import collator from '@/utils/collator.js'

definePage({
  name: 'SeriesCardTable',
  meta: {
    group: 'series',
  },
})

const itemsPerLoad = 24
const allSeries = Object.values(seriesMap)
const displayedSeries = ref([])
const infiniteScrollRef = ref(null)

const uiStore = useUIStore()
const { seriesSearchTerm, seriesSortBy, seriesSortAscending, selectedGameType } =
  storeToRefs(uiStore)

const toggleSort = (field) => {
  if (seriesSortBy.value === field) {
    seriesSortAscending.value = !seriesSortAscending.value
  } else {
    seriesSortBy.value = field
  }
}

const recentStore = useRecentStore()
const { seriesIds } = storeToRefs(recentStore)

const recentlyViewed = computed(() => {
  return seriesIds.value.map((id) => seriesMap[id]).filter(Boolean)
})

const { smAndDown, smAndUp } = useDisplay()
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const filteredSeries = computed(() => {
  const term = seriesSearchTerm.value.trim().toLowerCase()
  const game = selectedGameType.value

  let list = allSeries.filter((item) => item.game === game)

  if (term) {
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.prefixes.some((prefix) => prefix.toLowerCase().includes(term))
    )
  }

  return list.sort((a, b) => {
    let comparison = 0
    if (seriesSortBy.value === 'date') {
      const dateA = a.latestReleaseDate === '-' ? new Date(0) : new Date(a.latestReleaseDate)
      const dateB = b.latestReleaseDate === '-' ? new Date(0) : new Date(b.latestReleaseDate)
      comparison = dateA.getTime() - dateB.getTime()
    } else {
      comparison = collator.compare(a.name, b.name)
    }
    return seriesSortAscending.value ? comparison : -comparison
  })
})

const load = async ({ done }) => {
  const currentLength = displayedSeries.value.length
  const totalFilteredLength = filteredSeries.value.length

  if (currentLength >= totalFilteredLength) {
    return done('empty')
  }

  const newItems = filteredSeries.value.slice(currentLength, currentLength + itemsPerLoad)

  await new Promise((resolve) => setTimeout(resolve, 100))

  displayedSeries.value.push(...newItems)
  done('ok')
}

watch([seriesSearchTerm, seriesSortBy, seriesSortAscending, selectedGameType], async () => {
  displayedSeries.value = []
  await nextTick()
  if (infiniteScrollRef.value) {
    infiniteScrollRef.value.reset()
  }
})

const storageKey = computed(() => 'seriesCardTableViewState')

useInfiniteScrollState({
  storageKey,
  scrollRef: infiniteScrollRef,
  onSave: () => {
    const scrollableElement = infiniteScrollRef.value?.$el
    if (scrollableElement) {
      return {
        itemCount: displayedSeries.value.length,
        scrollPosition: scrollableElement.scrollTop,
      }
    }
    return null
  },
  onRestore: (savedState) => {
    if (savedState.itemCount > 0) {
      displayedSeries.value = filteredSeries.value.slice(0, savedState.itemCount)
    }
    nextTick(() => {
      const scrollableElement = infiniteScrollRef.value?.$el
      if (scrollableElement) {
        scrollableElement.scrollTop = savedState.scrollPosition
      }
    })
  },
})

const scrollContainer = ref(null)
onMounted(() => {
  scrollContainer.value = infiniteScrollRef.value?.$el
})
</script>

<style scoped>
.glass.v-tabs,
.glass.v-btn-group,
.glass.v-btn {
  background: rgba(var(--v-theme-surface), 0.6) !important;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.series-grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 24px;
  width: 100%;
}

@media (max-width: 740px) {
  .series-grid-container {
    grid-template-columns: repeat(auto-fill, minmax(46%, 1fr));
    gap: 16px;
  }
}
</style>
