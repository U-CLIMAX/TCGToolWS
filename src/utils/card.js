import { useFilterStore } from '@/stores/filter.js'
import { seriesMap } from '@/maps/series-map.js'

const findAllPrefixesByCardPrefix = (prefix) => {
  const keyPart = prefix.split('-')[0].toLowerCase()
  const allPrefixes = new Set()

  for (const series in seriesMap) {
    const found = seriesMap[series].prefixes.find((p) => p.toLowerCase() === keyPart)
    if (found) {
      seriesMap[series].prefixes.forEach((p) => allPrefixes.add(p))
    }
  }

  return allPrefixes.size > 0 ? Array.from(allPrefixes) : [prefix]
}

const cardCache = new Map()

export const fetchCardByIdAndPrefix = (id, prefix) => {
  const cacheKey = `${prefix}-${id}`
  if (cardCache.has(cacheKey)) {
    return cardCache.get(cacheKey)
  }

  const fetchPromise = (async () => {
    try {
      const filterStore = useFilterStore()
      const seriesPrefixes = findAllPrefixesByCardPrefix(prefix)
      const { allCards } = await filterStore.fetchAndProcessCards(seriesPrefixes)

      const matchedCard = allCards.find((c) => c.id === id)

      if (!matchedCard) {
        console.warn(`Card ${id} not found in ${prefix}`)
        return null
      }

      return matchedCard
    } catch (e) {
      console.error(`Failed to load card ${id} (${prefix}):`, e)
      cardCache.delete(cacheKey)
      return null
    }
  })()

  cardCache.set(cacheKey, fetchPromise)
  return fetchPromise
}

export const fetchCardsByBaseIdAndPrefix = async (baseId, prefix) => {
  try {
    const filterStore = useFilterStore()
    const seriesPrefixes = findAllPrefixesByCardPrefix(prefix)
    const { allCards } = await filterStore.fetchAndProcessCards(seriesPrefixes)
    const cards = allCards.filter((c) => c.baseId === baseId)

    if (cards.length === 0) {
      console.warn(`Base card ${baseId} not found in ${prefix}`)
    }

    return cards
  } catch (e) {
    console.error(`Failed to load baseId ${baseId} (${prefix}):`, e)
    return []
  }
}
