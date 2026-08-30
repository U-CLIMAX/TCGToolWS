<template>
  <div ref="containerRef" class="h-100 position-relative">
    <!-- 抽屉滑动进场动画期间或数据加载中，仅展示极轻量的居中加载指示器，避免重度 DOM 与图表并发卡顿 -->
    <div
      v-if="embedded && (!isTransitionReady || isLoading || !deck)"
      class="d-flex align-center justify-center h-100 w-100"
    >
      <v-progress-circular indeterminate color="primary" size="56" />
    </div>

    <!-- 仅在动画过渡完成且数据就绪后挂载 DeckDetailTemplate（独立页面 embedded 为 false 时直接渲染） -->
    <DeckDetailTemplate
      v-if="deck && (isTransitionReady || !embedded)"
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
import { ref, onMounted, onUnmounted, toRaw, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckEncoder } from '@/composables/useDeckEncoder'
import { fetchCardByIdAndPrefix } from '@/utils/card'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'
import { useDeckStore } from '@/stores/deck'
import { useFilterStore } from '@/stores/filter'
import { generateDeckKey } from '@/utils/nanoid'
import { seriesMap } from '@/maps/series-map'
import { useModalTransition } from '@/composables/useModalTransition'

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
const { isTransitionReady, waitForTransition } = useModalTransition()

const containerRef = ref(null)
const deck = ref(null)
const cards = ref({})
const isLoading = ref(false)
const filterStore = useFilterStore()

/**
 * 保存或另存卡组至用户个人库。
 * @param {object} param0 保存参数载荷
 * @param {string} param0.name 卡组名称
 * @param {object} param0.coverCardId 封面卡牌标识
 * @param {Function} [param0.closeDialog] 关闭保存弹窗的回调函数
 * @param {string[]} [param0.tags] 卡组标签列表
 */
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

/** 当前卡组数据请求的批次编号，用于消除快速切换卡组或抽屉关闭时的竞态覆盖 */
let currentLoadRequestId = 0

/**
 * 加载卡组详细数据并解析卡片信息。
 *
 * 策略：
 * 1. 当作为侧边抽屉内嵌展示（embedded === true）时，优先等待抽屉滑入动画（transitionend）彻底完成。
 * 2. 抽屉滑入就绪后，再触发卡组数据 fetch 与卡牌的详细元数据批量解析，保证移动端抽屉动画丝滑。
 * 3. 独立页面（embedded === false）无滑入动画，直接立即拉取，不引入任何额外延迟。
 */
const loadDeckData = async () => {
  if (!props.deckKey) return

  const requestId = ++currentLoadRequestId
  const setLoading = (val) => (props.embedded ? (isLoading.value = val) : uiStore.setLoading(val))
  setLoading(true)

  try {
    if (props.embedded) {
      await waitForTransition(containerRef)
      if (requestId !== currentLoadRequestId) return
    }

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
  filterStore.reset()
})
</script>
