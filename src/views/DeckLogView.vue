<template>
  <DeckDetail
    :deck="deck"
    :cards="cards"
    :deck-title="deck ? deck.title : deckKey"
    @save="handleSaveDeck"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeckEncoder } from '@/composables/useDeckEncoder'
import { fetchCardByIdAndPrefix } from '@/utils/card'
import { useUIStore } from '@/stores/ui'
import { useDeckStore } from '@/stores/deck'
import { useSnackbar } from '@/composables/useSnackbar'
import DeckDetail from '@/components/deck/DeckDetailTemplate.vue'
import { findDeckSeriesId } from '@/utils/findDeckSeriesId'

const route = useRoute()
const router = useRouter()
const { encodeDeck } = useDeckEncoder()
const uiStore = useUIStore()
const deckStore = useDeckStore()
const { triggerSnackbar } = useSnackbar()

const deckKey = route.params.key
const deck = ref(null)
const cards = ref({})

const handleSaveDeck = async ({ name, coverCardId }) => {
  uiStore.setLoading(true)

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
    const deckSeriesId = findDeckSeriesId(Object.keys(cards.value))
    const deckData = {
      name: name,
      version: deckStore.version,
      cards: cardsToEncode,
      seriesId: deckSeriesId,
      coverCardId: coverCardId,
    }

    const { key } = await encodeDeck(deckData, { isSharedDeck: true })
    triggerSnackbar('卡组保存成功！', 'success')
    await router.push(`/decks/${key}`)
  } catch (error) {
    triggerSnackbar(error.message, 'error')
    console.error('❌ 創建失敗:', error)
  } finally {
    uiStore.setLoading(false)
  }
}

onMounted(async () => {
  uiStore.setLoading(true)

  try {
    let initialCards = {}
    const response = await deckStore.fetchDecklog(deckKey)
    deck.value = response
    initialCards = response.deckList

    // ---獲取所有卡片的完整資料 ---
    const cardPromises = initialCards.map(async (card) => {
      const id = card.card_number
      const cardIdPrefix = id.split('/')[0]
      const fullCardData = await fetchCardByIdAndPrefix(id, cardIdPrefix)
      if (fullCardData) {
        return { ...fullCardData, quantity: card.num }
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
    uiStore.setLoading(false)
  }
})
</script>
