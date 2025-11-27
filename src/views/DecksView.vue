<template>
  <div class="fill-height d-flex overflow-y-auto themed-scrollbar">
    <v-container class="h-100 pa-0">
      <div class="d-flex justify-center pt-3 px-3">
        <v-sheet
          class="search-container"
          :class="{ 'glass-sheet': hasBackgroundImage }"
          rounded="lg"
          elevation="2"
        >
          <!-- 搜尋與篩選區域 -->
          <div class="d-flex flex-column flex-sm-row mb-3">
            <v-text-field
              v-model="deckNameSearchTerm"
              label="搜索卡组名称"
              variant="solo-filled"
              density="compact"
              append-inner-icon="mdi-magnify"
              hide-details
              flat
              class="flex-grow-1 mr-sm-2 mb-2 mb-sm-0"
            />
            <v-select
              v-model="selectedSeries"
              :items="availableSeriesOptions"
              item-title="title"
              item-value="value"
              label="筛选系列"
              variant="solo-filled"
              density="compact"
              hide-details
              flat
              clearable
              class="flex-shrink-0 series-select"
              :menu-props="uiStore.menuProps"
            />
          </div>

          <v-btn block variant="tonal" prepend-icon="mdi-import" @click="showDeckCodeDialog = true">
            通过卡组代码查看
          </v-btn>
        </v-sheet>
      </div>

      <v-dialog v-model="showDeckCodeDialog" max-width="500px">
        <v-card>
          <v-card-title>输入卡组代码</v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="7">
                <v-select
                  v-model="deckCodeSource"
                  :items="sourceOptions"
                  item-title="title"
                  item-value="value"
                  label="代码来源"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="5">
                <v-text-field
                  v-model="deckCode"
                  label="卡组代码"
                  variant="outlined"
                  density="compact"
                  hide-details
                  autofocus
                  @keydown.enter="navigateToSharedDeck"
                />
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showDeckCodeDialog = false">取消</v-btn>
            <v-btn color="primary" variant="flat" @click="navigateToSharedDeck">确定</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <transition-group
        v-if="initialLoadingComplete"
        tag="div"
        class="v-row ma-1 pt-3"
        name="deck-fade"
        appear
      >
        <v-col v-for="item in displayedDecks" :key="item.key" class="pa-2" cols="4" sm="2">
          <DeckCard :deck="item.deck" :deckKey="item.key" :is-editing="item.isEditing" />
        </v-col>
      </transition-group>
    </v-container>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckStore } from '@/stores/deck'
import { useDeckEncoder } from '@/composables/useDeckEncoder'
import DeckCard from '@/components/deck/DeckCard.vue'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'
import { seriesMap } from '@/maps/series-map'

const router = useRouter()
const deckStore = useDeckStore()
const { decodeDeck } = useDeckEncoder()
const uiStore = useUIStore()
const { triggerSnackbar } = useSnackbar()

const deckCode = ref('')
const deckNameSearchTerm = ref('')
const selectedSeries = ref(null)
const decodedDecks = ref({})
const initialLoadingComplete = ref(false)
const showDeckCodeDialog = ref(false)
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

// 卡組代碼來源
const deckCodeSource = ref('uclimax') // 默認選擇 U CLIMAX
const sourceOptions = [
  {
    title: 'U CLIMAX',
    value: 'uclimax',
    routeName: 'ShareDeckDetail',
  },
  {
    title: 'DeckLog JP',
    value: 'decklog',
    routeName: 'DeckLog',
  },
]

// 計算可用的系列選項並包含數量
const availableSeriesOptions = computed(() => {
  const counts = {}

  // 遍歷所有已解碼的牌組來統計數量
  Object.values(decodedDecks.value).forEach((deck) => {
    if (deck.seriesId) {
      const foundEntry = Object.entries(seriesMap).find(([, info]) => info.id === deck.seriesId)

      if (foundEntry) {
        const seriesName = foundEntry[0]
        counts[seriesName] = (counts[seriesName] || 0) + 1
      }
    }
  })

  return Object.keys(counts)
    .sort()
    .map((name) => ({
      title: `${name} (${counts[name]})`,
      value: name,
    }))
})

const filteredDecks = computed(() => {
  const searchTerm = deckNameSearchTerm.value.toLowerCase()
  const seriesFilter = selectedSeries.value // 這裡拿到的仍然是純系列名稱 (value)

  if (!searchTerm && !seriesFilter) {
    return decodedDecks.value
  }

  return Object.fromEntries(
    Object.entries(decodedDecks.value).filter(([, deck]) => {
      // 名稱篩選邏輯
      const matchesName = !searchTerm || deck.name.toLowerCase().includes(searchTerm)

      // 系列篩選邏輯
      let matchesSeries = true
      if (seriesFilter) {
        const targetSeriesId = seriesMap[seriesFilter]?.id
        matchesSeries = deck.seriesId === targetSeriesId
      }

      return matchesName && matchesSeries
    })
  )
})

const navigateToSharedDeck = () => {
  const code = deckCode.value.trim()
  if (code) {
    const selectedOption = sourceOptions.find((opt) => opt.value === deckCodeSource.value)
    router.push({
      name: selectedOption.routeName,
      params: { key: code },
    })
    showDeckCodeDialog.value = false
    deckCode.value = ''
  }
}

const localDeck = computed(() => {
  if (deckStore.totalCardCount > 0 && !deckStore.editingDeckKey) {
    const cards = Object.values(deckStore.cardsInDeck)
    return {
      name: '未命名卡组',
      cards: deckStore.cardsInDeck,
      coverCardId: deckStore.coverCardId || (cards.length > 0 ? cards[0].id : null),
      seriesId: deckStore.seriesId,
    }
  }
  return null
})

const displayedDecks = computed(() => {
  if (!initialLoadingComplete.value) {
    return []
  }

  const items = []

  if (localDeck.value) {
    items.push({
      deck: localDeck.value,
      key: 'local',
      isEditing: true,
    })
  }

  for (const key in filteredDecks.value) {
    items.push({
      deck: filteredDecks.value[key],
      key: key,
      isEditing: key === deckStore.editingDeckKey,
    })
  }

  return items
})

const loadDecodedDecks = async () => {
  const decks = {}
  for (const key in deckStore.savedDecks) {
    const decoded = await decodeDeck(key)
    if (decoded) {
      decks[key] = decoded
    }
  }
  decodedDecks.value = decks
}

onMounted(async () => {
  uiStore.setLoading(true)

  try {
    await deckStore.fetchDecks()
  } catch (error) {
    triggerSnackbar(error.message, 'error')
  } finally {
    uiStore.setLoading(false)
    initialLoadingComplete.value = true
  }
})

watch(
  () => deckStore.savedDecks,
  async () => {
    await loadDecodedDecks()
  },
  { deep: true }
)
</script>

<style scoped>
.search-container {
  width: 100%;
  max-width: 600px;
  padding: 16px;
}

.deck-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.deck-fade-enter-from {
  opacity: 0;
  transform: scale(0.9);
}
.series-select {
  width: 100%; /* 手機版預設佔滿整行 */
}

@media (min-width: 600px) {
  .series-select {
    width: auto;
    min-width: 100px;
    max-width: 250px;
  }
}
</style>
