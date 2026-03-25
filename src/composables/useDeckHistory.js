import { ref } from 'vue'
import { fetchCardByIdAndPrefix } from '@/utils/card'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'

/**
 * Composable for managing deck history view state and logic.
 */
export function useDeckHistory() {
  const uiStore = useUIStore()
  const { triggerSnackbar } = useSnackbar()

  const isHistoryDialogVisible = ref(false)
  const viewingHistoryIndex = ref(null)
  const historicalCards = ref([])
  const isViewingHistory = ref(false)

  /**
   * Calculates and views a specific historical state of the deck.
   * @param {number} index - The 1-based index of the history entry to view.
   * @param {Array} history - The full history array.
   * @param {Array} originalCards - The current (latest) cards in the deck.
   * @param {string} seriesId - The series ID for fetching card data.
   */
  const viewHistoryState = async (index, history, originalCards, seriesId) => {
    uiStore.setLoading(true)
    try {
      const historyIndex = index - 1
      const targetHistoryEntry = history[historyIndex]
      if (!targetHistoryEntry) return

      viewingHistoryIndex.value = index
      isViewingHistory.value = true
      isHistoryDialogVisible.value = false

      // Step 1: Calculate the full deck state at that point in time by reverting changes.
      // The history is newest first (index 0), so we revert changes from 0 to historyIndex - 1.
      const cardMap = new Map(JSON.parse(JSON.stringify(originalCards)).map((c) => [c.id, c]))

      for (let i = 0; i < historyIndex; i++) {
        const entry = history[i]
        if (!entry.diff) continue

        for (const change of entry.diff) {
          const cardId = change.cardId
          const card = cardMap.get(cardId)
          const prefix = change.cardId.split('/')[0].toLowerCase()

          switch (change.status) {
            case 'added': // Revert an add = remove
              if (card) {
                card.quantity -= change.quantity
                if (card.quantity <= 0) {
                  cardMap.delete(cardId)
                }
              }
              break
            case 'removed': // Revert a remove = add back
              // eslint-disable-next-line no-case-declarations
              const fullCardData = await fetchCardByIdAndPrefix(cardId, prefix)
              if (fullCardData) {
                if (card) {
                  card.quantity += change.quantity
                } else {
                  cardMap.set(cardId, { ...fullCardData, quantity: change.quantity })
                }
              }
              break
            case 'modified': // Revert a modification = set back to 'from'
              if (card) {
                card.quantity = change.from
              }
              break
          }
        }
      }

      // Step 2: Apply diffStatus to the calculated state based on the target change.
      const targetDiffMap = new Map((targetHistoryEntry.diff || []).map((d) => [d.cardId, d]))

      const finalCards = Array.from(cardMap.values()).map((card) => {
        const change = targetDiffMap.get(card.id)
        if (change) {
          let diffStatus = change.status
          if (change.status === 'modified') {
            diffStatus = change.to > change.from ? 'increased' : 'decreased'
          }
          return { ...card, diffStatus }
        } else {
          return { ...card, diffStatus: 'unchanged' }
        }
      })

      // Step 3: Add back any cards that were 'removed' in this specific change, so they appear in the list.
      for (const change of targetHistoryEntry.diff || []) {
        if (change.status === 'removed') {
          const fullCardData = await fetchCardByIdAndPrefix(change.cardId, seriesId)
          if (fullCardData) {
            finalCards.push({
              ...fullCardData,
              quantity: 0,
              diffStatus: 'removed',
            })
          }
        }
      }

      historicalCards.value = finalCards
    } catch (error) {
      triggerSnackbar('加载历史记录失败', 'error')
      console.error(error)
      exitHistoryView()
    } finally {
      uiStore.setLoading(false)
    }
  }

  const exitHistoryView = () => {
    isViewingHistory.value = false
    viewingHistoryIndex.value = null
    historicalCards.value = []
  }

  return {
    isHistoryDialogVisible,
    viewingHistoryIndex,
    historicalCards,
    isViewingHistory,
    viewHistoryState,
    exitHistoryView,
  }
}
