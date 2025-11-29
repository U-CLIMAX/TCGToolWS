import { seriesMap } from '@/maps/series-map.js'

/**
 * 根據卡號列表計算最主要的 Series ID
 * 邏輯：看哪個 Series 的 prefixes 列表中包含最多 "目前卡片出現過的 Prefix"
 * @param {string[]} cardIds - 卡號字串陣列 (e.g. ['Sks/W123-T10', 'Ssn/W123-004'])
 * @returns {string|null} - 回傳 Series ID 或 null
 */
export const findDeckSeriesId = (cardIds) => {
  if (!cardIds || cardIds.length === 0) return null

  // 取得目前卡組中所有出現過的 Prefix
  const deckUniquePrefixes = [...new Set(cardIds.map((id) => id.split('/')[0]))]

  let bestSeriesId = null
  let maxMatchCount = -1

  // 遍歷 SeriesMap 尋找命中數最高的
  Object.values(seriesMap).forEach((series) => {
    const matchCount = deckUniquePrefixes.reduce((count, prefix) => {
      return series.prefixes.includes(prefix) ? count + 1 : count
    }, 0)

    if (matchCount > maxMatchCount) {
      maxMatchCount = matchCount
      bestSeriesId = series.id
    }
  })

  return bestSeriesId
}
