<template>
  <div class="h-100 position-relative">
    <v-overlay
      v-if="embedded"
      :model-value="isLoading"
      class="align-center justify-center"
      :class="!smAndUp ? 'rounded-0' : 'rounded-3md'"
      contained
      persistent
      no-click-animation
      z-index="5"
    >
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-overlay>

    <DeckDetailTemplate
      :deck="deck"
      :cards="cards"
      :deck-title="deck ? deck.deck_name : deckKey"
      :embedded="embedded"
      :deck-key="deckKey"
      @save="handleSaveDeck"
      @close="$emit('close')"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, toRaw, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router'
import { useDeckEncoder } from '@/composables/useDeckEncoder'
import { fetchCardByIdAndPrefix } from '@/utils/card'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'
import { useDeckStore } from '@/stores/deck'
import { generateDeckKey } from '@/utils/nanoid'
import { seriesMap } from '@/maps/series-map'

const props = defineProps({
  deckKey: {
    type: String,
    required: true,
  },
  embedded: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['close'])

const router = useRouter()
const { decodeData, encodeData } = useDeckEncoder()
const uiStore = useUIStore()
const deckStore = useDeckStore()
const { triggerSnackbar } = useSnackbar()
const { smAndUp } = useDisplay()

const deck = ref(null)
const cards = ref({})
const isLoading = ref(false)

const handleSaveDeck = async ({ name, coverCardId, closeDialog, tags }) => {
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

    const gameType = seriesMap[deck.value.series_id]?.game || 'ws'

    await deckStore.saveEncodedDeck(key, compressedData, {
      name: name,
      seriesId: deck.value.series_id,
      game_type: gameType,
      coverCardId: coverCardId,
      tags: tags || [],
    })

    triggerSnackbar('卡组保存成功！', 'success')
    if (closeDialog) closeDialog()
    await router.push(`/decks/${key}`)
  } catch (error) {
    triggerSnackbar(error.message, 'error')
    console.error('❌ 創建失敗:', error)
  } finally {
    setLoading(false)
  }
}

const loadDeckData = async () => {
  if (!props.deckKey) return

  const setLoading = (val) => (props.embedded ? (isLoading.value = val) : uiStore.setLoading(val))
  setLoading(true)

  try {
    let initialCards = {}
    const data = await deckStore.fetchDeckByKey(props.deckKey)
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

watch(() => props.deckKey, loadDeckData)

onMounted(() => {
  loadDeckData()
})
</script>
