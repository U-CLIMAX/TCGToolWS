<template>
  <div class="h-100 position-relative">
    <!-- 数据加载中，展示居中加载指示器遮罩 -->
    <v-fade-transition>
      <div
        v-if="embedded && isLoading"
        class="d-flex align-center justify-center position-absolute fill-height w-100"
      >
        <v-progress-circular indeterminate color="primary" size="56" />
      </div>
    </v-fade-transition>

    <!-- 挂载 DeckDetailTemplate（常驻布局保持预热，加载中透明隐藏且禁止交互） -->
    <DeckDetailTemplate
      :deck="deck"
      :cards="cards"
      :deck-title="deck ? deck.deck_name : deckKey"
      :embedded="embedded"
      :deck-key="deckKey"
      :style="{
        opacity: embedded && isLoading ? 0 : 1,
        pointerEvents: embedded && isLoading ? 'none' : 'auto',
        transition: 'opacity 0.2s ease',
      }"
      @save="handleSaveDeck"
      @close="$emit('close')"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, toRaw, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckEncoder } from '@/composables/useDeckEncoder'
import { fetchCardByIdAndPrefix } from '@/utils/card'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/composables/useSnackbar'
import { useDeckStore } from '@/stores/deck'
import { generateDeckKey } from '@/utils/nanoid'
import { seriesMap } from '@/maps/series-map'
import { isTauri } from '@/utils/isTauri'

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
const authStore = useAuthStore()
const deckStore = useDeckStore()
const { triggerSnackbar } = useSnackbar()

const deck = ref(null)
const cards = ref({})
const isLoading = ref(false)

/**
 * 保存或另存卡组至用户个人库。
 * @param {object} param0 保存参数载荷
 * @param {string} param0.name 卡组名称
 * @param {object} param0.coverCardId 封面卡牌标识
 * @param {Function} [param0.closeDialog] 关闭保存弹窗的回调函数
 * @param {string[]} [param0.tags] 卡组标签列表
 * @param {string} [param0.saveTarget] 保存目标 ('cloud' | 'local')
 */
const handleSaveDeck = async ({ name, coverCardId, closeDialog, tags, saveTarget }) => {
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

    const isSaveToCloud = !isTauri
      ? authStore.isAuthenticated && authStore.isOnline
      : saveTarget === 'cloud' && authStore.isAuthenticated && authStore.isOnline

    if (isSaveToCloud) {
      await deckStore.saveEncodedDeck(key, compressedData, {
        name: name,
        seriesId: deck.value.series_id,
        game_type: gameType,
        coverCardId: coverCardId,
        tags: tags || [],
      })
    } else {
      deckStore.saveLocalDeck(key, compressedData, {
        name: name,
        seriesId: deck.value.series_id,
        game_type: gameType,
        coverCardId: coverCardId,
        tags: tags || [],
      })
    }

    triggerSnackbar(isSaveToCloud ? '新卡组保存成功！' : '新卡组已成功保存到本地！', 'success')
    if (closeDialog) closeDialog()
    await router.push(`/decks/${key}`)
  } catch (error) {
    triggerSnackbar(error.message, 'error')
    console.error('❌ 創建失敗:', error)
  } finally {
    setLoading(false)
  }
}

/** 当前卡组数据请求的批次编号，用于消除快速切换卡组或抽屉关闭时的竞态覆盖 */
let currentLoadRequestId = 0

/**
 * 加载卡组详细数据并解析卡片信息。
 */
const loadDeckData = async () => {
  if (!props.deckKey) {
    deck.value = null
    cards.value = {}
    return
  }

  const requestId = ++currentLoadRequestId
  const setLoading = (val) => (props.embedded ? (isLoading.value = val) : uiStore.setLoading(val))
  setLoading(true)
  deck.value = null
  cards.value = {}

  try {
    let initialCards = {}
    const data = await deckStore.fetchDeckByKey(props.deckKey)
    if (requestId !== currentLoadRequestId) return

    deck.value = {
      ...data,
      deckData: await decodeData(toRaw(data.deck_data)),
    }
    if (requestId !== currentLoadRequestId) return
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
    if (requestId !== currentLoadRequestId) return

    cards.value = fullCardsData.reduce((acc, card) => {
      acc[card.id] = card
      return acc
    }, {})
  } catch (error) {
    triggerSnackbar(error.message, 'error')
  } finally {
    if (requestId === currentLoadRequestId) {
      setLoading(false)
    }
  }
}

watch(() => props.deckKey, loadDeckData)

onMounted(() => {
  loadDeckData()
})

onUnmounted(() => {
  currentLoadRequestId++
  deck.value = null
  cards.value = {}
})
</script>
