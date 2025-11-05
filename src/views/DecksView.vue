<template>
  <div class="fill-height d-flex overflow-y-auto themed-scrollbar">
    <v-container class="h-100 pa-0">
      <div class="d-flex justify-center pt-3 px-3">
        <v-sheet
          class="search-container"
          :class="{ 'glass-sheet': hasBackgroundImage && !transparent }"
          rounded="lg"
          elevation="2"
        >
          <v-text-field
            v-model="deckNameSearchTerm"
            label="搜索卡组名称"
            variant="solo-filled"
            density="compact"
            append-inner-icon="mdi-magnify"
            hide-details
            flat
            class="mb-3"
          />
          <v-btn block variant="tonal" prepend-icon="mdi-import" @click="showDeckCodeDialog = true">
            通过卡组代码查看
          </v-btn>
        </v-sheet>
      </div>

      <v-dialog v-model="showDeckCodeDialog" max-width="500px">
        <v-card>
          <v-card-title>输入卡组代码</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="deckCode"
              label="卡组代码"
              variant="outlined"
              density="compact"
              hide-details
              autofocus
              @keydown.enter="navigateToSharedDeck"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showDeckCodeDialog = false">取消</v-btn>
            <v-btn color="primary" variant="flat" @click="navigateToSharedDeck">确认</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-row class="ma-1 pt-3" no-gutters>
        <v-col v-if="localDeck && initialLoadingComplete" class="pa-2" cols="4" sm="2">
          <DeckCard :deck="localDeck" deckKey="local" :is-editing="true" />
        </v-col>
        <v-col v-for="(deck, key) in filteredDecks" :key="key" class="pa-2" cols="4" sm="2">
          <DeckCard :deck="deck" :deckKey="key" :is-editing="key === deckStore.editingDeckKey" />
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
const deckNameSearchTerm = ref('')
const decodedDecks = ref({})
const initialLoadingComplete = ref(false)
const showDeckCodeDialog = ref(false)
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const filteredDecks = computed(() => {
  const searchTerm = deckNameSearchTerm.value.toLowerCase()
  if (!searchTerm) {
    return decodedDecks.value
  }
  return Object.fromEntries(
    Object.entries(decodedDecks.value).filter(([, deck]) =>
      deck.name.toLowerCase().includes(searchTerm)
    )
  )
})

const navigateToSharedDeck = () => {
  const code = deckCode.value.trim()
  if (code) {
    router.push({
      name: 'ShareDeckDetail',
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
</style>
