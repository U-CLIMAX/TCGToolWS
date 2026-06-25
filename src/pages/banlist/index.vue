<template>
  <v-container fluid class="banlist-view pa-0 h-100 d-flex flex-column">
    <div class="overflow-y-auto themed-scrollbar" :style="scrollStyle" ref="scrollContainerRef">
      <v-container
        class="h-100 pa-0 flex-grow-0"
        :class="{ 'mt-8': smAndUp, 'pa-4 pb-0': !smAndUp }"
      >
        <div class="d-flex justify-center px-3">
          <v-row class="w-100">
            <v-col cols="12">
              <div class="d-flex align-center mb-8" :class="smAndUp ? 'ga-4' : 'ga-3 mb-4'">
                <v-avatar
                  color="light-blue-accent-3"
                  :size="smAndUp ? 77 : 56"
                  class="rounded-circle shadow-sm pa-2"
                >
                  <v-icon :icon="banListIcon" class="w-100 h-100" />
                </v-avatar>
                <div>
                  <h1 :class="smAndUp ? 'text-h4' : 'text-h5'" class="font-weight-bold mb-1">
                    限制卡表
                  </h1>
                  <div class="text-caption text-medium-emphasis mt-n1">标准构筑，系列限制构筑</div>
                  <div class="text-caption text-medium-emphasis" style="opacity: 0.8">
                    [{{ deckRestrictionsLastUpdated }}]表更新
                  </div>
                </div>
              </div>
              <v-divider
                :class="smAndUp ? 'mb-8' : 'mb-0'"
                :length="smAndUp ? '60%' : '90%'"
                thickness="3"
              ></v-divider>
            </v-col>

            <v-col cols="12" class="px-0">
              <div class="banlist-masonry w-100">
                <div v-for="series in banlistData" :key="series.id" class="masonry-item mb-6">
                  <div class="px-2">
                    <h2 :class="smAndUp ? 'text-h4' : 'text-h5'" class="font-weight-medium mb-3">
                      {{ series.title }}
                    </h2>

                    <div v-for="(cat, idx) in series.categories" :key="idx" class="mb-8">
                      <div
                        class="d-inline-block text-white px-4 py-1 mb-4"
                        :style="{
                          backgroundColor: cat.color,
                          borderRadius: '20px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                        }"
                      >
                        {{ cat.label }}
                      </div>

                      <div v-for="(group, gIdx) in cat.groups" :key="gIdx" class="mb-6">
                        <div class="d-flex flex-wrap ga-3 mb-4">
                          <v-img
                            v-for="card in group"
                            :key="card.name"
                            :src="card.image"
                            :lazy-src="card.lazyImage"
                            width="100"
                            max-width="100"
                            :aspect-ratio="400 / 559"
                            class="rounded preload-img"
                          >
                          </v-img>
                        </div>

                        <div class="d-flex mt-2">
                          <div
                            :style="{
                              width: '6px',
                              backgroundColor: cat.color,
                              borderRadius: '3px',
                            }"
                            class="mr-3 flex-shrink-0"
                          ></div>
                          <div
                            class="d-flex flex-column justify-center ga-1"
                            style="min-height: 24px"
                          >
                            <div
                              v-for="card in group"
                              :key="card.name"
                              class="d-flex flex-wrap align-center"
                            >
                              <span
                                class="text-body-2 font-weight-bold mr-2"
                                style="line-height: 1.4"
                              >
                                {{ card.name }}
                              </span>
                              <span
                                class="font-DINCond font-weight-light text-caption text-medium-emphasis"
                                style="line-height: 1.4"
                              >
                                {{ card.ids.join(' / ') }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>
      </v-container>
    </div>

    <BackToTopButton :scroll-container="scrollContainer" />
  </v-container>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import banListIcon from '@/assets/ui/banlist.svg'
import { useDisplay } from 'vuetify'
import { deckRestrictionsLastUpdated, deckRestrictions } from '@/maps/deck-restrictions'
import { ALL_SERIES_OPTIONS } from '@/maps/series-map'
import { getCardUrls } from '@/utils/getCardImage'

definePage({
  name: 'BanList',
  meta: { group: 'toolbox' },
})

const { smAndUp } = useDisplay()

const scrollStyle = computed(() => {
  const marginTop = smAndUp.value ? '50px' : '0'
  return {
    '--sb-margin-top': '27px',
    'marginTop': marginTop,
    'height': `calc(100% - ${marginTop})`,
  }
})

const scrollContainerRef = ref(null)
const scrollContainer = ref(null)

onMounted(() => {
  nextTick(() => {
    scrollContainer.value = scrollContainerRef.value
  })
})

const normalizeCard = (cardObj) => {
  if (cardObj.cardName) {
    const urls = getCardUrls(cardObj.prefix, cardObj.cardId[0])
    return {
      name: cardObj.cardName,
      ids: cardObj.cardId,
      prefix: cardObj.prefix,
      limit: cardObj.limit,
      image: urls.base,
      lazyImage: urls.blur,
    }
  } else {
    const keys = Object.keys(cardObj).filter((k) => k !== 'prefix')
    const name = keys[0]
    const urls = getCardUrls(cardObj.prefix, cardObj[name][0])
    return {
      name: name,
      ids: cardObj[name],
      prefix: cardObj.prefix,
      image: urls.base,
      lazyImage: urls.blur,
    }
  }
}

const banlistData = (() => {
  const result = []
  for (const [seriesId, restrictions] of Object.entries(deckRestrictions)) {
    const seriesInfo = ALL_SERIES_OPTIONS.find((s) => s.value === seriesId)
    const seriesTitle = seriesInfo ? seriesInfo.title : seriesId

    const seriesData = {
      id: seriesId,
      title: seriesTitle,
      categories: [],
    }

    if (restrictions.banned && restrictions.banned.length > 0) {
      const cards = restrictions.banned.map(normalizeCard)
      seriesData.categories.push({
        type: 'banned',
        label: '不能投入',
        color: '#990000',
        groups: [cards],
      })
    }

    if (restrictions.limited && restrictions.limited.length > 0) {
      const cards = restrictions.limited.map(normalizeCard)
      cards.forEach((card) => {
        seriesData.categories.push({
          type: 'limited',
          label: `限制${card.limit}张`,
          color: '#B06A00',
          groups: [[card]],
        })
      })
    }

    if (restrictions.choice && restrictions.choice.length > 0) {
      restrictions.choice.forEach((group) => {
        const cards = group.map(normalizeCard)
        seriesData.categories.push({
          type: 'choice',
          label: '选拔限制',
          color: '#004D99',
          groups: [cards],
        })
      })
    }

    result.push(seriesData)
  }
  return result
})()
</script>

<style scoped>
.v-theme--light .banlist-view {
  background-color: rgba(243, 241, 241, 0.7);
}

.v-theme--dark .banlist-view {
  background-color: rgba(44, 43, 43, 0.7);
}

.banlist-masonry {
  column-count: 1;
  column-gap: 64px;
}

@media (min-width: 600px) {
  .banlist-masonry {
    column-count: 2;
  }
}

.masonry-item {
  break-inside: avoid;
  page-break-inside: avoid;
  -webkit-column-break-inside: avoid;
  display: inline-block;
  width: 100%;
}
</style>
