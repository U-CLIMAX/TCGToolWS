import { computed } from 'vue'

/**
 * A composable function to group and sort a list of cards.
 * @param {import('vue').Ref<Array>} cards - A ref containing the array of cards to be grouped.
 * @param {import('vue').Ref<String>} groupBy - A ref containing the key to group the cards by (e.g., 'level', 'color').
 * @returns {{groupedCards: import('vue').ComputedRef<Map<String, Array>>}} - An object containing the computed grouped cards.
 */
export const useDeckGrouping = (cards, groupBy) => {
  const groupedCards = computed(() => {
    const cardList = cards.value
    if (!cardList || cardList.length === 0) {
      return new Map()
    }

    // Group cards
    const groups = cardList.reduce((acc, card) => {
      let key = card[groupBy.value]

      // Handle special cases for grouping key
      if (groupBy.value === 'level' && key === '-' && card.type === '高潮卡') {
        key = 'CX'
      } else if ((groupBy.value === 'level' || groupBy.value === 'cost') && key === '-') {
        key = '0'
      }

      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(card)
      return acc
    }, {})

    // Sort group keys
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (groupBy.value === 'level' || groupBy.value === 'cost') {
        if (a === 'CX') return -1 // CX always comes first
        if (b === 'CX') return 1
        return Number(a) - Number(b)
      }
      return String(a).localeCompare(String(b))
    })

    // Sort cards within each group
    sortedKeys.forEach((key) => {
      groups[key].sort((a, b) => String(a.id).localeCompare(String(b.id)))
    })

    // Return a new Map to preserve the sorted order
    return new Map(sortedKeys.map((key) => [key, groups[key]]))
  })

  return { groupedCards }
}
