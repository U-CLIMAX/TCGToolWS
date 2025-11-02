import { useFilterStore } from '@/stores/filter.js'
import { seriesMap } from '@/maps/series-map.js'

const findPrefixesByCardPrefix = (prefix) => {
  const keyPart = prefix.split('-')[0].toLowerCase()
  for (const series in seriesMap) {
    const found = seriesMap[series].prefixes.find((p) => p.toLowerCase() === keyPart)
    if (found) {
      return seriesMap[series].prefixes
    }
  }
  return [prefix]
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
      const seriesPrefixes = findPrefixesByCardPrefix(prefix)
      const { allCards } = await filterStore.fetchAndProcessCards(seriesPrefixes)

      const card =
        allCards.find((c) => (c.id === id || c.baseId === id) && c.cardIdPrefix === prefix) || null

      if (!card) {
        console.warn(`Card with ID "${id}" not found in prefix "${prefix}"`)
        return null
      }

      return card
    } catch (e) {
      console.error(`Failed to load card ${id} with prefix ${prefix}:`, e)
      // On error, remove the promise from the cache to allow retries
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
    const seriesPrefixes = findPrefixesByCardPrefix(prefix)
    const { allCards } = await filterStore.fetchAndProcessCards(seriesPrefixes)

    const cards = allCards.filter((c) => c.baseId === baseId)

    if (cards.length === 0) {
      console.warn(`Base card with ID "${baseId}" not found in prefix "${prefix}"`)
    }

    return cards
  } catch (e) {
    console.error(`Failed to load cards for baseId ${baseId} with prefix ${prefix}:`, e)
    return []
  }
}
