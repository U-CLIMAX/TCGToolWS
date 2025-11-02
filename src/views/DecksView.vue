<template>
  <div class="fill-height d-flex overflow-y-auto themed-scrollbar">
    <v-container class="h-100 pa-0">
      <v-row justify="center" class="ma-0 pt-3">
        <v-col cols="12" sm="8" md="6">
          <v-text-field
            v-model="deckCode"
            label="输入卡组代码"
            variant="solo"
            density="compact"
            append-inner-icon="mdi-magnify"
            hide-details
            @keydown.enter="navigateToSharedDeck"
            @click:append-inner="navigateToSharedDeck"
          />
        </v-col>
      </v-row>
      <v-row class="ma-0 pt-3">
        <v-col v-if="localDeck && initialLoadingComplete" cols="6" sm="4" md="3">
          <DeckCard :deck="localDeck" deckKey="local" :is-editing="true" />
        </v-col>
        <v-col v-for="(deck, key) in decodedDecks" :key="key" cols="6" sm="4" md="3">
          <DeckCard
            :deck="deck"
            :deckKey="key"
            :is-editing="key === deckStore.editingDeckKey"
          />
        </v-col>
      </v-row>
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

const router = useRouter()
const deckStore = useDeckStore()
const { decodeDeck } = useDeckEncoder()
const uiStore = useUIStore()
const { triggerSnackbar } = useSnackbar()

const deckCode = ref('')
const decodedDecks = ref({})
const initialLoadingComplete = ref(false)

const navigateToSharedDeck = () => {
  const code = deckCode.value.trim()
  if (code) {
    router.push({
      name: 'ShareDeckDetail',
      params: { key: code },
    })
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
    await loadDecodedDecks()
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

<style scoped></style>
