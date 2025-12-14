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
const filterStore = useFilterStore()

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

      let matchedCard = allCards.find((c) => c.id === id)

      if (!matchedCard) {
        console.warn(`Card with ID "${id}" not found in prefix "${prefix}"`)
        return null
      }

      return matchedCard
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
    const seriesPrefixes = findAllPrefixesByCardPrefix(prefix)
    const { allCards } = await filterStore.fetchAndProcessCards(seriesPrefixes)
    const cards = allCards.filter((c) => c.baseId === baseId)

    if (cards.length === 0) {
      console.warn(`Base card with ID "${baseId}" not found in prefix "${prefix}" `)
    }

    return cards
  } catch (e) {
    console.error(`Failed to load cards for baseId ${baseId} with prefix ${prefix}:`, e)
    return []
  }
}
