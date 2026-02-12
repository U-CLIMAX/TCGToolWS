<template>
  <div class="h-100 position-relative">
    <v-overlay
      v-if="embedded"
      :model-value="isLoading"
      class="align-center justify-center"
      contained
      persistent
      no-click-animation
      z-index="5"
    >
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-overlay>

    <DeckDetail
      :deck="deck"
      :cards="cards"
      :deck-title="deck ? deck.deck_name : effectiveKey"
      :embedded="embedded"
      :deck-key="effectiveKey"
      @save="handleSaveDeck"
      @close="$emit('close')"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, toRaw, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeckEncoder } from '@/composables/useDeckEncoder'
import { fetchCardByIdAndPrefix } from '@/utils/card'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'
import { useDeckStore } from '@/stores/deck'
import { generateDeckKey } from '@/utils/nanoid'
import DeckDetail from '@/components/deck/DeckDetailTemplate.vue'

const props = defineProps({
  deckKey: {
    type: String,
    default: null,
  },
  embedded: {
    type: Boolean,
    default: false,
  },
})

const route = useRoute()
const router = useRouter()
const { decodeData, encodeData } = useDeckEncoder()
const uiStore = useUIStore()
const deckStore = useDeckStore()
const { triggerSnackbar } = useSnackbar()

const effectiveKey = computed(() => props.deckKey || route.params.key)
const deck = ref(null)
const cards = ref({})
const isLoading = ref(false)

const handleSaveDeck = async ({ name, coverCardId }) => {
  const setLoading = (val) => (props.embedded ? (isLoading.value = val) : uiStore.setLoading(val))
  setLoading(true)

  try {
    const cardsToEncode = Object.values(cards.value).reduce((acc, card) => {
      acc[card.id] = {
        id: card.id,
        cardIdPrefix: card.cardIdPrefix,
        product_name: card.product_name,
        level: card.level,
        color: card.color,
        cost: card.cost,
        type: card.type,
        quantity: card.quantity,
      }
      return acc
    }, {})

    const key = generateDeckKey()
    const compressedData = await encodeData(cardsToEncode)
    await deckStore.saveEncodedDeck(key, compressedData, {
      name: name,
      seriesId: deck.value.series_id,
      coverCardId: coverCardId,
    })

    triggerSnackbar('卡组保存成功！', 'success')
    await router.push(`/decks/${key}`)
  } catch (error) {
    triggerSnackbar(error.message, 'error')
    console.error('❌ 創建失敗:', error)
  } finally {
    setLoading(false)
  }
}

const loadDeckData = async () => {
  if (!effectiveKey.value) return

  // init deck
  deck.value = null

  const setLoading = (val) => (props.embedded ? (isLoading.value = val) : uiStore.setLoading(val))
  setLoading(true)

  try {
    let initialCards = {}
    const data = await deckStore.fetchDeckByKey(effectiveKey.value)
    deck.value = {
      ...data,
      deckData: await decodeData(toRaw(data.deck_data)),
    }
    initialCards = deck.value.deckData

    // ---獲取所有卡片的完整資料 ---
    const cardPromises = Object.values(initialCards).map(async (card) => {
      const fullCardData = await fetchCardByIdAndPrefix(card.id, card.cardIdPrefix)
      if (fullCardData) {
        return { ...fullCardData, quantity: card.quantity }
      }
      return null
    })

    const fullCardsData = (await Promise.all(cardPromises)).filter(Boolean)
    cards.value = fullCardsData.reduce((acc, card) => {
      acc[card.id] = card
      return acc
    }, {})
  } catch (error) {
    triggerSnackbar(error.message, 'error')
  } finally {
    setLoading(false)
  }
}

watch(effectiveKey, loadDeckData)

onMounted(() => {
  loadDeckData()
})
</script>
