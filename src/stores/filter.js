import { defineStore } from 'pinia'
import { ref } from 'vue'
import { findSeriesDataFileName } from '@/maps/series-card-map.js'
import { getAssetsFile } from '@/utils/getAssetsFile.js'
import { useCardFiltering } from '@/composables/useCardFiltering.js'

const cache = new Map()

export const useFilterStore = defineStore('filter', () => {
  // --- State ---

  // Raw data from API
  const allCards = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // Filter options derived from raw data
  const productNames = ref([])
  const traits = ref([])
  const rarities = ref([])
  const costRange = ref({ min: 0, max: 0 })
  const powerRange = ref({ min: 0, max: 0 })

  // Use the composable for filtering logic
  const {
    keyword,
    searchMode,
    selectedCardTypes,
    selectedColors,
    selectedProductName,
    selectedTraits,
    selectedLevels,
    selectedRarities,
    showUniqueCards,
    selectedCostRange,
    selectedPowerRange,
    resetFilters,
    filteredCards,
    terminateWorker, // Extract terminateWorker
    initializeWorker,
  } = useCardFiltering(productNames, traits, rarities, costRange, powerRange)

  // --- Actions ---

  const fetchAndProcessCards = async (prefixes) => {
    if (!prefixes || prefixes.length === 0) {
      return {
        allCards: [],
        productNames: [],
        traits: [],
        costRange: { min: 0, max: 0 },
        powerRange: { min: 0, max: 0 },
      }
    }

    const cacheKey = prefixes.join(',')
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)
    }

    error.value = null

    try {
      const dataFilePaths = findSeriesDataFileName(prefixes)
      const allFileContents = await Promise.all(
        dataFilePaths.map(async (path) => {
          const url = await getAssetsFile(path)
          const response = await fetch(url, { priority: 'high' })
          if (!response.ok) throw new Error(`Failed to fetch ${path}`)
          return {
            content: await response.json(),
            cardIdPrefix: path.split('/').pop().replace('.json', ''),
          }
        })
      )

      const fetchedCards = []
      const productNamesSet = new Set()
      const traitsSet = new Set()
      const raritiesSet = new Set()
      let minCost = Infinity,
        maxCost = -Infinity,
        minPower = Infinity,
        maxPower = -Infinity

      for (const file of allFileContents) {
        for (const baseId in file.content) {
          const cardData = file.content[baseId]

          if (cardData.product_name) productNamesSet.add(cardData.product_name)
          if (cardData.trait && Array.isArray(cardData.trait))
            cardData.trait.forEach((t) => traitsSet.add(t))
          if (typeof cardData.cost === 'number') {
            minCost = Math.min(minCost, cardData.cost)
            maxCost = Math.max(maxCost, cardData.cost)
          }
          if (typeof cardData.power === 'number') {
            minPower = Math.min(minPower, cardData.power)
            maxPower = Math.max(maxPower, cardData.power)
          }

          const { all_cards, ...baseCardData } = cardData
          if (all_cards && Array.isArray(all_cards)) {
            const minIdLength =
              all_cards.length > 0 ? Math.min(...all_cards.map((c) => c.id.length)) : 0

            all_cards.forEach((cardVersion) => {
              if (cardVersion.rarity) raritiesSet.add(cardVersion.rarity)
              const isLowest = cardVersion.id.length === minIdLength

              fetchedCards.push({
                ...baseCardData,
                ...cardVersion,
                baseId,
                cardIdPrefix: file.cardIdPrefix,
                isLowestRarity: isLowest,
              })
            })
          }
        }
      }

      fetchedCards.forEach((card) => (card.link = []))

      const nameToCardBaseIds = new Map()
      const baseIdToCardsMap = new Map()

      for (const card of fetchedCards) {
        if (!nameToCardBaseIds.has(card.name)) {
          nameToCardBaseIds.set(card.name, new Set())
        }
        nameToCardBaseIds.get(card.name).add(card.baseId)

        if (!baseIdToCardsMap.has(card.baseId)) {
          baseIdToCardsMap.set(card.baseId, [])
        }
        baseIdToCardsMap.get(card.baseId).push(card)
      }

      const escapeRegex = (str) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      }

      const allNamesPattern = [...nameToCardBaseIds.keys()].map(escapeRegex).join('|')

      const nameMatcherRegex = new RegExp(`「(${allNamesPattern})」`, 'g')

      for (const targetCard of fetchedCards) {
        const effectText = targetCard.effect || ''
        if (!effectText) continue

        const matches = effectText.matchAll(nameMatcherRegex)

        for (const match of matches) {
          const foundName = match[1]
          const sourceBaseIds = nameToCardBaseIds.get(foundName)

          if (sourceBaseIds) {
            for (const sourceBaseId of sourceBaseIds) {
              if (!targetCard.link.includes(sourceBaseId)) {
                targetCard.link.push(sourceBaseId)
              }
              const sourceCardsToUpdate = baseIdToCardsMap.get(sourceBaseId)
              if (sourceCardsToUpdate) {
                for (const sourceCard of sourceCardsToUpdate) {
                  if (!sourceCard.link.includes(targetCard.baseId)) {
                    sourceCard.link.push(targetCard.baseId)
                  }
                }
              }
            }
          }
        }
      }

      const result = {
        allCards: fetchedCards,
        productNames: [...productNamesSet],
        traits: [...traitsSet],
        rarities: [...raritiesSet].sort(),
        costRange: {
          min: minCost === Infinity ? 0 : minCost,
          max: maxCost === -Infinity ? 0 : maxCost,
        },
        powerRange: {
          min: minPower === Infinity ? 0 : minPower,
          max: maxPower === -Infinity ? 0 : maxPower,
        },
      }

      cache.set(cacheKey, result)
      return result
    } catch (e) {
      console.error('Failed to load series cards in filter store:', e)
      error.value = e
      return {
        allCards: [],
        productNames: [],
        traits: [],
        costRange: { min: 0, max: 0 },
        powerRange: { min: 0, max: 0 },
      }
    }
  }

  const initialize = async (prefixes) => {
    isLoading.value = true
    error.value = null
    try {
      const {
        allCards: fetchedCards,
        productNames: fetchedProductNames,
        traits: fetchedTraits,
        rarities: fetchedRarities,
        costRange: fetchedCostRange,
        powerRange: fetchedPowerRange,
      } = await fetchAndProcessCards(prefixes)

      allCards.value = fetchedCards
      productNames.value = fetchedProductNames
      traits.value = fetchedTraits
      rarities.value = fetchedRarities
      costRange.value = fetchedCostRange
      powerRange.value = fetchedPowerRange
      resetFilters()
      await initializeWorker(fetchedCards)
    } catch (e) {
      console.error('Failed to initialize filter store:', e)
      error.value = e
    } finally {
      isLoading.value = false
    }
  }

  const reset = () => {
    terminateWorker() // Terminate worker when store is reset
    allCards.value = []
    productNames.value = []
    traits.value = []
    rarities.value = []
    costRange.value = { min: 0, max: 0 }
    powerRange.value = { min: 0, max: 0 }
    resetFilters()
  }

  return {
    // State
    allCards,
    isLoading,
    error,
    productNames,
    traits,
    rarities,
    costRange,
    powerRange,
    keyword,
    searchMode,
    selectedCardTypes,
    selectedColors,
    selectedProductName,
    selectedTraits,
    selectedLevels,
    selectedRarities,
    showUniqueCards,
    selectedCostRange,
    selectedPowerRange,
    // Getters
    filteredCards,
    // Actions
    initialize,
    fetchAndProcessCards,
    resetFilters,
    reset,
  }
})
