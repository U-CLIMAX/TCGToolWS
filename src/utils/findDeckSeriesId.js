import { seriesMap } from '@/maps/series-map.js'

/**
 * 根據卡號列表計算最主要的 Series ID
 * 邏輯：看哪個 Series 的 prefixes 列表中包含最多 "目前卡片出現過的 Prefix"
 * @param {string[]} cardIdPrefixes - 卡號前綴列表，例如 ["WS01", "WS02", "DM01"]
 * @returns {string|null} - 回傳 Series ID 或 null
 */
export const findDeckSeriesId = (cardIdPrefixes) => {
  if (!cardIdPrefixes || cardIdPrefixes.length === 0) return null

  let bestSeriesId = null
  let maxMatchCount = -1

  // 遍歷 SeriesMap 尋找命中數最高的
  Object.values(seriesMap).forEach((series) => {
    const matchCount = cardIdPrefixes.reduce((count, prefix) => {
      return series.prefixes
        .map((p) => p.toLowerCase())
        .includes(prefix.split('-')[0].toLowerCase())
        ? count + 1
        : count
    }, 0)

    if (matchCount > maxMatchCount) {
      maxMatchCount = matchCount
      bestSeriesId = series.id
    }
  })

  return bestSeriesId
}
