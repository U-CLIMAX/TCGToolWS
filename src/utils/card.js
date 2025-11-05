import { useFilterStore } from '@/stores/filter.js'
import { seriesMap } from '@/maps/series-map.js'

// 找出所有包含該 prefix 的系列的所有 prefixes
const findAllPrefixesByCardPrefix = (prefix) => {
  const keyPart = prefix.split('-')[0].toLowerCase()
  const allPrefixes = new Set()

  for (const series in seriesMap) {
    const found = seriesMap[series].prefixes.find((p) => p.toLowerCase() === keyPart)
    if (found) {
      // 將該系列的所有 prefixes 加入 Set 中
      seriesMap[series].prefixes.forEach((p) => allPrefixes.add(p))
    }
  }

  // 如果沒找到任何匹配，返回原始 prefix
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

      const uniqueCardsMap = new Map()
      allCards.forEach((card) => {
        const key = `${card.cardIdPrefix}-${card.id}`
        if (!uniqueCardsMap.has(key)) {
          uniqueCardsMap.set(key, card)
        }
      })

      const uniqueCards = Array.from(uniqueCardsMap.values())
      const matchedCards = uniqueCards.filter(
        (c) => (c.id === id || c.baseId === id) && c.cardIdPrefix === prefix
      )

      if (matchedCards.length === 0) {
        console.warn(`Card with ID "${id}" not found in prefix "${prefix}"`)
        return null
      }

      if (matchedCards.length > 1) {
        console.warn(
          `Multiple cards found with ID "${id}" and prefix "${prefix}". Returning the first one.`,
          matchedCards
        )
      }

      return matchedCards[0]
    } catch (e) {
      console.error(`Failed to load card ${id} with prefix ${prefix}:`, e)
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

    const uniqueCardsMap = new Map()
    allCards.forEach((card) => {
      const key = `${card.cardIdPrefix}-${card.id}`
      if (!uniqueCardsMap.has(key)) {
        uniqueCardsMap.set(key, card)
      }
    })
    const uniqueCards = Array.from(uniqueCardsMap.values())
    const cards = uniqueCards.filter((c) => c.baseId === baseId)

    if (cards.length === 0) {
      console.warn(`Base card with ID "${baseId}" not found in prefix "${prefix}"`)
    }

    return cards
  } catch (e) {
    console.error(`Failed to load cards for baseId ${baseId} with prefix ${prefix}:`, e)
    return []
  }
}
