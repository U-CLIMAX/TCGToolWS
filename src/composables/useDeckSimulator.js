import { ref, shallowRef, computed, onUnmounted } from 'vue'
import {
  getDefaultMulliganRules,
  expandDeck,
  simulateSingleDraw,
  runMonteCarloSimulation,
  getRuleDescription,
} from '@/utils/deckSimulator'

/**
 * Composable for Weiss Schwarz Mulligan and Hand Simulator
 * @param {import('vue').Ref<Array<Object>>} cardsRef - Ref to array of cards in deck
 */
export const useDeckSimulator = (cardsRef) => {
  const rules = ref(getDefaultMulliganRules())
  const sampleSize = ref(1000)
  const isSimulating = ref(false)
  const singleResult = shallowRef(null)
  const batchResult = shallowRef(null)
  let simTimeoutId = null

  const cleanUp = () => {
    if (simTimeoutId) {
      clearTimeout(simTimeoutId)
      simTimeoutId = null
    }
  }

  onUnmounted(cleanUp)

  const cardList = computed(() => {
    const raw = cardsRef?.value
    if (!raw) return []
    return Array.isArray(raw) ? raw : Object.values(raw)
  })

  const expandedDeck = computed(() => expandDeck(cardList.value))

  const totalDeckCount = computed(() =>
    cardList.value.reduce((sum, c) => sum + (Number(c.quantity) || 1), 0)
  )

  /**
   * Add a new rule
   */
  const addRule = (newRule) => {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    rules.value = [...rules.value, { ...newRule, id }]
  }

  /**
   * Remove a rule by index
   */
  const removeRule = (index) => {
    rules.value = rules.value.filter((_, i) => i !== index)
  }

  /**
   * Move rule up (higher priority)
   */
  const moveRuleUp = (index) => {
    if (index <= 0) return
    const updated = [...rules.value]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    rules.value = updated
  }

  /**
   * Move rule down (lower priority)
   */
  const moveRuleDown = (index) => {
    if (index >= rules.value.length - 1) return
    const updated = [...rules.value]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    rules.value = updated
  }

  /**
   * Reset rules to standard defaults
   */
  const resetRules = () => {
    rules.value = getDefaultMulliganRules()
  }

  /**
   * Run a single interactive draw
   */
  const runSingle = () => {
    if (expandedDeck.value.length === 0) return null
    const result = simulateSingleDraw(expandedDeck.value, rules.value)
    singleResult.value = result
    return result
  }

  /**
   * Run Monte Carlo batch simulation (async chunking to keep UI responsive)
   */
  const runBatch = (runs = sampleSize.value) => {
    if (cardList.value.length === 0) return Promise.resolve(null)
    cleanUp()
    isSimulating.value = true

    return new Promise((resolve) => {
      simTimeoutId = setTimeout(() => {
        const stats = runMonteCarloSimulation(cardList.value, rules.value, runs)
        batchResult.value = stats
        isSimulating.value = false
        resolve(stats)
      }, 30)
    })
  }

  return {
    rules,
    sampleSize,
    isSimulating,
    singleResult,
    batchResult,
    totalDeckCount,
    addRule,
    removeRule,
    moveRuleUp,
    moveRuleDown,
    resetRules,
    runSingle,
    runBatch,
    describeRule: (rule) => getRuleDescription(rule, cardList.value),
  }
}
