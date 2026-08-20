import { useFilterStore } from '@/stores/filter.js'
import { useGlobalSearchStore } from '@/stores/globalSearch.js'
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

const MAX_CARD_CACHE = 300
const cardCache = new Map()
const seriesIdCache = new Map()

export const fetchCardByIdAndPrefix = (id, prefix) => {
  const cacheKey = `${prefix}-${id}`
  if (cardCache.has(cacheKey)) {
    return cardCache.get(cacheKey)
  }

  if (cardCache.size >= MAX_CARD_CACHE) {
    const firstKey = cardCache.keys().next().value
    if (firstKey) cardCache.delete(firstKey)
  }

  const fetchPromise = (async () => {
    try {
      // 1. 全局搜尋頁面：若 globalSearchStore 已就緒，優先直接從記憶體/Worker 查詢
      const globalSearchStore = useGlobalSearchStore()
      if (globalSearchStore.isReady) {
        const card = await globalSearchStore.getCardById(id)
        if (card) {
          return card
        }
      }

      // 2. 其他頁面或未命中：按需調用 filterStore 下載系列 JSON
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

export const getCardSeriesId = (id) => {
  const prefix = id.split('-')[0]

  if (seriesIdCache.has(prefix)) {
    return seriesIdCache.get(prefix)
  }

  const matchingSeries = Object.values(seriesMap).filter(
    (s) => s.prefixes && s.prefixes.some((p) => p.toUpperCase() === prefix.toUpperCase())
  )

  const result = matchingSeries.map((s) => ({ id: s.id, yytUrl: s.yytUrl }))
  seriesIdCache.set(prefix, result)

  return result
}
