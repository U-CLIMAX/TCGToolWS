<template>
  <v-container fluid class="h-100 pa-0">
    <FloatingSearch />
    <v-infinite-scroll
      ref="infiniteScrollRef"
      @load="load"
      empty-text=""
      class="h-100 themed-scrollbar"
    >
      <v-container class="pt-0" :class="{ 'px-0': smAndDown }">
        <v-sheet
          v-if="recentlyViewed.length > 0"
          :color="!hasBackgroundImage ? undefined : 'transparent'"
          class="rounded-5md"
          :class="{
            'glass-card': hasBackgroundImage,
            'pt-2': !smAndDown,
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
                :color="isLightWithBg ? 'white' : ''"
                :class="smAndDown ? 'mb-1' : 'mr-2'"
                icon="mdi-history"
                size="small"
              />
              <div
                class="text-subtitle-2 font-weight-bold"
                :class="isLightWithBg ? 'text-white' : ''"
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
              <v-slide-group-item v-for="item in recentlyViewed" :key="item.data.id">
                <div class="ma-1" :style="{ width: smAndDown ? '100px' : '150px' }">
                  <SeriesCard
                    :series-name="item.name"
                    :series-data="item.data"
                    :is-compact="true"
                  />
                </div>
              </v-slide-group-item>
            </v-slide-group>
          </div>
        </v-sheet>
      </v-container>

      <v-container class="pt-0" :class="{ 'px-10': smAndDown }">
        <div class="d-flex justify-center mt-4">
          <v-tabs
            v-model="seriesGameFilter"
            class="w-fit d-inline-flex"
            :class="{ 'glass rounded-pill px-4 border-e-md border-s-md': hasBackgroundImage }"
            density="compact"
          >
            <v-tab value="ws" class="font-weight-bold"> WS </v-tab>
            <v-tab value="wsr" class="font-weight-bold" color="ws-rose"> WSR </v-tab>
          </v-tabs>
        </div>

        <v-row justify="space-between" align="center" class="px-1 mt-2 mb-4">
          <v-btn-toggle
            v-model="seriesSortBy"
            mandatory
            density="compact"
            :variant="hasBackgroundImage ? 'tonal' : 'text'"
            :class="{ glass: hasBackgroundImage }"
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
            variant="tonal"
            class="ml-4"
            :class="{ glass: hasBackgroundImage }"
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
            class="d-flex pa-1"
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
import { useTheme, useDisplay } from 'vuetify'
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
const { seriesSearchTerm, seriesSortBy, seriesSortAscending, seriesGameFilter } =
  storeToRefs(uiStore)

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
const { smAndDown } = useDisplay()
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)
const isLightWithBg = computed(() => {
  return hasBackgroundImage.value && theme.global.name.value === 'light'
})

const filteredSeries = computed(() => {
  const term = seriesSearchTerm.value.trim().toLowerCase()
  const game = seriesGameFilter.value

  let list = allSeries.value.filter((item) => item.data.game === game)

  if (term) {
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.data.prefixes.some((prefix) => prefix.toLowerCase().includes(term))
    )
  }

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

watch([seriesSearchTerm, seriesSortBy, seriesSortAscending, seriesGameFilter], async () => {
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
</style>
