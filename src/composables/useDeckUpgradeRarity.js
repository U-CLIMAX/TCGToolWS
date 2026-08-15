import { ref } from 'vue'
import { useDeckStore } from '@/stores/deck'
import { useFilterStore } from '@/stores/filter'
import { usePriceStore } from '@/stores/price'
import { useSnackbar } from '@/composables/useSnackbar'
import { getCardSeriesId } from '@/utils/card'

/**
 * Selects the best high rarity card among candidate cards.
 * - Filters for non-lowest rarity cards (`!c.isLowestRarity`).
 * - If none found, returns null.
 * - If 1 found, returns that card.
 * - If > 1 found, compares prices via getPriceFn and returns the card with the highest price.
 *   If prices are equal or missing, returns the first high rarity card.
 *
 * @param {Array<object>} candidates - List of candidate cards with the same baseId.
 * @param {Function} [getPriceFn] - Function that returns number | null for a given card.
 * @returns {object|null}
 */
export const selectBestHighRarityCard = (candidates, getPriceFn) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return null

  const highRarityCards = candidates.filter((c) => !c.isLowestRarity)
  if (highRarityCards.length === 0) {
    return null
  }
  if (highRarityCards.length === 1) {
    return highRarityCards[0]
  }

  let bestCard = highRarityCards[0]
  let maxPrice = typeof getPriceFn === 'function' ? getPriceFn(bestCard) : null

  for (let i = 1; i < highRarityCards.length; i++) {
    const card = highRarityCards[i]
    const price = typeof getPriceFn === 'function' ? getPriceFn(card) : null

    if (price != null && (maxPrice == null || price > maxPrice)) {
      bestCard = card
      maxPrice = price
    }
  }

  return bestCard
}

/**
 * Composable providing one-click upgrade of all deck cards to high rarity versions.
 */
export const useDeckUpgradeRarity = () => {
  const isUpgrading = ref(false)
  const deckStore = useDeckStore()
  const filterStore = useFilterStore()
  const priceStore = usePriceStore()
  const { triggerSnackbar } = useSnackbar()

  /**
   * Looks up the price of a card using series IDs and the price store.
   * @param {object} card
   * @returns {number|null}
   */
  const getCardPrice = (card) => {
    if (!card?.cardIdPrefix || !card?.id) return null
    const infos = getCardSeriesId(card.cardIdPrefix)
    for (const info of infos) {
      const price = priceStore.getPrice(info.id, card.id)
      if (price !== undefined && price !== null) {
        return typeof price === 'number' ? price : Number(price) || null
      }
    }
    return null
  }

  /**
   * Upgrades all cards in the current deck to their highest rarity versions.
   */
  const upgradeAllCardsToHighRarity = async () => {
    if (deckStore.totalCardCount === 0 || isUpgrading.value) {
      return
    }

    isUpgrading.value = true
    try {
      const currentDeckEntries = Object.entries(deckStore.cardsInDeck || {})
      if (currentDeckEntries.length === 0) return

      const prefixes = Array.from(
        new Set(
          currentDeckEntries.map(([, item]) => item.cardIdPrefix?.split('-')[0]).filter(Boolean)
        )
      )

      if (prefixes.length === 0) return

      const { allCards = [] } = await filterStore.fetchAndProcessCards(prefixes)

      const baseIdToCardsMap = new Map()
      const idToCardMap = new Map()

      for (const card of allCards) {
        idToCardMap.set(card.id, card)
        const baseId = card.baseId
        if (!baseIdToCardsMap.has(baseId)) {
          baseIdToCardsMap.set(baseId, [])
        }
        baseIdToCardsMap.get(baseId).push(card)
      }

      let upgradedTypesCount = 0
      const newCardsInDeck = {}
      let newCoverCardId = deckStore.coverCardId

      for (const [currentCardId, item] of currentDeckEntries) {
        const foundCard = idToCardMap.get(currentCardId)
        const baseId = foundCard?.baseId || item.baseId || currentCardId
        const candidates = baseIdToCardsMap.get(baseId) || []

        const bestCard = selectBestHighRarityCard(candidates, getCardPrice)

        if (bestCard && bestCard.id !== currentCardId) {
          const targetId = bestCard.id
          if (newCardsInDeck[targetId]) {
            newCardsInDeck[targetId].quantity += item.quantity
          } else {
            newCardsInDeck[targetId] = {
              ...item,
              ...bestCard,
              quantity: item.quantity,
            }
          }
          upgradedTypesCount++

          if (deckStore.coverCardId) {
            if (
              typeof deckStore.coverCardId === 'object' &&
              deckStore.coverCardId?.id === currentCardId
            ) {
              newCoverCardId = {
                id: bestCard.id,
                cardIdPrefix: bestCard.cardIdPrefix,
              }
            } else if (deckStore.coverCardId === currentCardId) {
              newCoverCardId = bestCard.id
            }
          }
        } else {
          if (newCardsInDeck[currentCardId]) {
            newCardsInDeck[currentCardId].quantity += item.quantity
          } else {
            newCardsInDeck[currentCardId] = { ...item }
          }
        }
      }

      if (upgradedTypesCount > 0) {
        deckStore.cardsInDeck = newCardsInDeck
        deckStore.coverCardId = newCoverCardId
        deckStore.checkRestrictions()
        triggerSnackbar(`已将 ${upgradedTypesCount} 种卡片升级为高罕版本！`, 'success')
      } else {
        triggerSnackbar('当前卡组已为最高罕版本', 'info')
      }
    } catch (error) {
      console.error('Failed to upgrade cards to high rarity:', error)
      triggerSnackbar('升级高罕失败，请重试', 'error')
    } finally {
      isUpgrading.value = false
    }
  }

  return {
    isUpgrading,
    upgradeAllCardsToHighRarity,
    selectBestHighRarityCard,
  }
}
