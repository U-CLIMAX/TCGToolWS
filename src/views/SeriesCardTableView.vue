<template>
  <v-container fluid class="h-100 pa-0">
    <FloatingSearch />
    <v-infinite-scroll
      ref="infiniteScrollRef"
      @load="load"
      empty-text=""
      class="h-100 themed-scrollbar"
    >
      <v-container class="pa-0">
        <v-sheet v-if="recentlyViewed.length > 0" color="transparent">
          <div class="d-flex align-center mb-2">
            <v-icon :color="isLightWithBg ? 'white' : ''" class="mr-2" icon="mdi-history" />
            <div class="text-h6" :class="isLightWithBg ? 'text-white' : ''">最近查看</div>
          </div>

          <v-slide-group class="pa-2" show-arrows>
            <v-slide-group-item v-for="item in recentlyViewed" :key="item.data.id">
              <div class="ma-1" style="width: 150px">
                <SeriesCard :series-name="item.name" :series-data="item.data" :is-compact="true" />
              </div>
            </v-slide-group-item>
          </v-slide-group>
        </v-sheet>
      </v-container>

      <v-container class="pt-0">
        <v-row justify="space-between" align="center" class="px-3 mt-2">
          <v-btn-toggle
            v-model="seriesSortBy"
            mandatory
            density="compact"
            variant="tonal"
            :class="isLightWithBg ? 'text-white' : ''"
          >
            <v-btn value="date" size="small">
              <v-icon start>mdi-calendar</v-icon>
              Date
            </v-btn>
            <v-btn value="name" size="small">
              <v-icon start>mdi-sort-alphabetical-variant</v-icon>
              Name
            </v-btn>
          </v-btn-toggle>

          <v-btn
            @click="seriesSortAscending = !seriesSortAscending"
            density="compact"
            variant="tonal"
            class="ml-4"
            :class="isLightWithBg ? 'text-white' : ''"
          >
            <v-icon start>{{ seriesSortAscending ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            {{ seriesSortAscending ? 'Asc' : 'Desc' }}
          </v-btn>
        </v-row>
        <v-row>
          <v-col
            v-for="item in displayedSeries"
            :key="item.data.id"
            cols="6"
            sm="3"
            md="2"
            class="d-flex"
          >
            <SeriesCard :series-name="item.name" :series-data="item.data" />
          </v-col>
        </v-row>

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
import { useTheme } from 'vuetify'
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/ui'
import { useRecentStore } from '@/stores/recent'
import { useInfiniteScrollState } from '@/composables/useInfiniteScrollState.js'
import { seriesMap } from '@/maps/series-map.js'
import SeriesCard from '@/components/card/SeriesCard.vue'
import FloatingSearch from '@/components/ui/FloatingSearchBar.vue'
import BackToTopButton from '@/components/ui/BackToTopButton.vue'
import collator from '@/utils/collator.js'

const itemsPerLoad = 24
const allSeries = ref(
  Object.entries(seriesMap).map(([name, data]) => ({
    name,
    data,
  }))
)
const displayedSeries = ref([])
const infiniteScrollRef = ref(null)

const uiStore = useUIStore()
const { seriesSearchTerm, seriesSortBy, seriesSortAscending } = storeToRefs(uiStore)

const recentStore = useRecentStore()
const { seriesIds } = storeToRefs(recentStore)

const recentlyViewed = computed(() => {
  return seriesIds.value
    .map((id) => {
      const seriesEntry = Object.entries(seriesMap).find(([, data]) => data.id === id)
      return seriesEntry ? { name: seriesEntry[0], data: seriesEntry[1] } : null
    })
    .filter(Boolean)
})

const theme = useTheme()
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)
const isLightWithBg = computed(() => {
  return hasBackgroundImage.value && theme.global.name.value === 'light'
})

const filteredSeries = computed(() => {
  const term = seriesSearchTerm.value.trim().toLowerCase()
  const list = term
    ? allSeries.value.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.data.prefixes.some((prefix) => prefix.toLowerCase().includes(term))
      )
    : allSeries.value.slice()

  return list.sort((a, b) => {
    let comparison = 0
    if (seriesSortBy.value === 'date') {
      const dateA =
        a.data.latestReleaseDate === '-' ? new Date(0) : new Date(a.data.latestReleaseDate)
      const dateB =
        b.data.latestReleaseDate === '-' ? new Date(0) : new Date(b.data.latestReleaseDate)
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

watch(
  [seriesSearchTerm, seriesSortBy, seriesSortAscending],
  async () => {
    displayedSeries.value = []
    await nextTick()
    if (infiniteScrollRef.value) {
      infiniteScrollRef.value.reset()
    }
  },
  { deep: true }
)

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
