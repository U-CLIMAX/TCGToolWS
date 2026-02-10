export const updateMarketStats = async (env) => {
  try {
    const query = `
      SELECT series_id, COUNT(*) as count
      FROM market_listings
      GROUP BY series_id
      ORDER BY count DESC, updated_at DESC
      LIMIT 5
    `
    const { results } = await env.DB.prepare(query).all()
    const stats = {
      updated_at: Math.floor(Date.now() / 1000),
      top5: results || [],
    }

    await env.MARKET_KV.put('MARKET_STATS_SERIES_RANKING', JSON.stringify(stats))
    console.log('Market stats updated successfully')
  } catch (error) {
    console.error('Failed to update market stats:', error)
    throw error
  }
}

export const getMarketStats = async (env) => {
  try {
    const statsStr = await env.MARKET_KV.get('MARKET_STATS_SERIES_RANKING')
    if (!statsStr) {
      return null
    }
    return JSON.parse(statsStr)
  } catch (error) {
    console.error('Failed to get market stats:', error)
    return null
  }
}
