<template>
  <v-container fluid class="h-100 pa-0">
    <FloatingSearch @update:search-term="onSearch" />
    <v-infinite-scroll
      ref="infiniteScrollRef"
      @load="load"
      empty-text=""
      class="h-100 themed-scrollbar"
    >
      <v-container class="pt-0">
        <v-row justify="space-between" align="center" class="px-3 mt-2">
          <v-btn-toggle
            v-model="sortBy"
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
            @click="sortAscending = !sortAscending"
            density="compact"
            variant="tonal"
            class="ml-4"
            :class="isLightWithBg ? 'text-white' : ''"
          >
            <v-icon start>{{ sortAscending ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            {{ sortAscending ? 'Asc' : 'Desc' }}
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
import { useInfiniteScrollState } from '@/composables/useInfiniteScrollState.js'
import { seriesMap } from '@/maps/series-map.js'
import SeriesCard from '@/components/card/SeriesCard.vue'
import FloatingSearch from '@/components/ui/FloatingSearchBar.vue'
import BackToTopButton from '@/components/ui/BackToTopButton.vue'
import collator from '@/utils/collator.js'
import { useUIStore } from '@/stores/ui'

const itemsPerLoad = 24
const allSeries = ref(
  Object.entries(seriesMap).map(([name, data]) => ({
    name,
    data,
  }))
)
const searchTerm = ref('')
const sortBy = ref('date') // 'date' or 'name'
const sortAscending = ref(false)
const displayedSeries = ref([])
const infiniteScrollRef = ref(null)

const uiStore = useUIStore()
const theme = useTheme()
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const isLightWithBg = computed(() => {
  return hasBackgroundImage.value && theme.global.name.value === 'light'
})

const filteredSeries = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  const list = term
    ? allSeries.value.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.data.prefixes.some((prefix) => prefix.toLowerCase().includes(term))
      )
    : allSeries.value.slice()

  return list.sort((a, b) => {
    let comparison = 0
    if (sortBy.value === 'date') {
      const dateA =
        a.data.latestReleaseDate === '-' ? new Date(0) : new Date(a.data.latestReleaseDate)
      const dateB =
        b.data.latestReleaseDate === '-' ? new Date(0) : new Date(b.data.latestReleaseDate)
      comparison = dateA.getTime() - dateB.getTime()
    } else {
      comparison = collator.compare(a.name, b.name)
    }
    return sortAscending.value ? comparison : -comparison
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
  filteredSeries,
  () => {
    displayedSeries.value = []
    if (infiniteScrollRef.value) {
      infiniteScrollRef.value.reset()
    }
  },
  { immediate: true }
)

const onSearch = (newTerm) => {
  searchTerm.value = newTerm
}

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
