import { createErrorResponse } from './utils.js'

/**
 * Retrieves decks from the gallery with cursor-based pagination and filtering.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetDecksGallery = async (c) => {
  try {
    const { limit, series, sort = 'newest', cursor } = c.req.query()
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20))

    let cursorObj = null
    if (cursor) cursorObj = JSON.parse(atob(cursor))

    const conditions = []
    const params = []

    if (series) {
      conditions.push('series_id = ?')
      params.push(series)
    }

    let orderByClause = 'updated_at DESC, key DESC'
    let cursorCondition = ''

    if (sort === 'oldest') {
      orderByClause = 'updated_at ASC, key ASC'
      if (cursorObj) {
        cursorCondition = '(updated_at, key) > (?, ?)'
        params.push(cursorObj.t, cursorObj.k)
      }
    } else {
      // Default: newest
      orderByClause = 'updated_at DESC, key DESC'
      if (cursorObj) {
        cursorCondition = '(updated_at, key) < (?, ?)'
        params.push(cursorObj.t, cursorObj.k)
      }
    }

    if (cursorCondition) {
      conditions.push(cursorCondition)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT key, user_id, deck_name, series_id, cover_cards_id, climax_cards_id, updated_at, rating_avg
      FROM decks_gallery
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ?
    `

    const { results } = await c.env.DB.prepare(query)
      .bind(...params, limitNum + 1)
      .all()

    const hasNextPage = results.length > limitNum
    const decks = hasNextPage ? results.slice(0, limitNum) : results

    let nextCursor = null
    if (hasNextPage && decks.length > 0) {
      const lastItem = decks[decks.length - 1]
      nextCursor = btoa(JSON.stringify({ t: lastItem.updated_at, k: lastItem.key }))
    }

    const parsedDecks = decks.map((d) => ({
      ...d,
      cover_cards_id: JSON.parse(d.cover_cards_id),
      climax_cards_id: JSON.parse(d.climax_cards_id),
    }))

    return c.json({
      decks: parsedDecks,
      nextCursor,
      limit: limitNum,
    })
  } catch (error) {
    console.error('Error fetching gallery decks:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Retrieves decks from the gallery created by the authenticated user.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetUserDecksGallery = async (c) => {
  try {
    const user = c.get('user')
    const { limit, series, sort = 'newest', cursor } = c.req.query()
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20))

    let cursorObj = null
    if (cursor) cursorObj = JSON.parse(atob(cursor))

    const conditions = ['user_id = ?']
    const params = [user.id]

    if (series) {
      conditions.push('series_id = ?')
      params.push(series)
    }

    let orderByClause = 'updated_at DESC, key DESC'
    let cursorCondition = ''

    if (sort === 'oldest') {
      orderByClause = 'updated_at ASC, key ASC'
      if (cursorObj) {
        cursorCondition = '(updated_at, key) > (?, ?)'
        params.push(cursorObj.t, cursorObj.k)
      }
    } else {
      // Default: newest
      orderByClause = 'updated_at DESC, key DESC'
      if (cursorObj) {
        cursorCondition = '(updated_at, key) < (?, ?)'
        params.push(cursorObj.t, cursorObj.k)
      }
    }

    if (cursorCondition) {
      conditions.push(cursorCondition)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    const query = `
      SELECT key, user_id, deck_name, series_id, cover_cards_id, climax_cards_id, updated_at, rating_avg
      FROM decks_gallery
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ?
    `

    const { results } = await c.env.DB.prepare(query)
      .bind(...params, limitNum + 1)
      .all()

    const hasNextPage = results.length > limitNum
    const decks = hasNextPage ? results.slice(0, limitNum) : results

    let nextCursor = null
    if (hasNextPage && decks.length > 0) {
      const lastItem = decks[decks.length - 1]
      nextCursor = btoa(JSON.stringify({ t: lastItem.updated_at, k: lastItem.key }))
    }

    const parsedDecks = decks.map((d) => ({
      ...d,
      cover_cards_id: JSON.parse(d.cover_cards_id),
      climax_cards_id: JSON.parse(d.climax_cards_id),
    }))

    return c.json({
      decks: parsedDecks,
      nextCursor,
      limit: limitNum,
    })
  } catch (error) {
    console.error('Error fetching user gallery decks:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Deletes a deck from the gallery.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleDeleteGalleryDeck = async (c) => {
  try {
    const user = c.get('user')
    const { key } = c.req.param()

    if (!key) return createErrorResponse(c, 400, '缺少 key')

    const info = await c.env.DB.prepare('DELETE FROM decks_gallery WHERE key = ? AND user_id = ?')
      .bind(key, user.id)
      .run()

    if (!info.success) return createErrorResponse(c, 500, '数据库操作失败')
    if (info.changes === 0) return createErrorResponse(c, 404, '卡组未找到或无权删除')

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting gallery deck:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Gets the total count of decks in the gallery for the authenticated user.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetMyGalleryCount = async (c) => {
  try {
    const user = c.get('user')
    const { count } = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM decks_gallery WHERE user_id = ?'
    )
      .bind(user.id)
      .first()

    return c.json({ count: count || 0 })
  } catch (error) {
    console.error('Error fetching gallery count:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Rates a deck in the gallery.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleRateDeck = async (c) => {
  try {
    const user = c.get('user')
    const { key } = c.req.param()
    const { rating } = await c.req.json()

    if (!key || rating === undefined || rating === null || (rating !== 0 && (rating < 1 || rating > 5))) {
      return createErrorResponse(c, 400, '参数错误')
    }

    const now = Math.floor(Date.now() / 1000)

    if (rating === 0) {
      // Delete rating
      await c.env.DB.prepare(
        'DELETE FROM deck_ratings WHERE deck_key = ? AND user_id = ?'
      )
        .bind(key, user.id)
        .run()
    } else {
      // Insert or Update rating
      await c.env.DB.prepare(
        `INSERT INTO deck_ratings (deck_key, user_id, rating, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(deck_key, user_id) DO UPDATE SET
         rating = excluded.rating,
         updated_at = excluded.updated_at`
      )
        .bind(key, user.id, rating, now)
        .run()
    }

    // Recalculate average and count
    const { avgRating, count } = await c.env.DB.prepare(
      `SELECT AVG(rating) as avgRating, COUNT(*) as count FROM deck_ratings WHERE deck_key = ?`
    )
      .bind(key)
      .first()

    // Calculate breakdown
    const { results } = await c.env.DB.prepare(
      `SELECT rating, COUNT(*) as count FROM deck_ratings WHERE deck_key = ? GROUP BY rating`
    )
      .bind(key)
      .all()

    const breakdown = [0, 0, 0, 0, 0]
    results.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        breakdown[r.rating - 1] = r.count
      }
    })
    const breakdownStr = JSON.stringify(breakdown)

    // Update decks_gallery
    await c.env.DB.prepare(
      `UPDATE decks_gallery SET rating_avg = ?, rating_count = ?, rating_breakdown = ? WHERE key = ?`
    )
      .bind(avgRating || 0, count || 0, breakdownStr, key)
      .run()

    return c.json({
      success: true,
      rating_avg: avgRating || 0,
      rating_count: count || 0,
      rating_breakdown: breakdown,
    })
  } catch (error) {
    console.error('Error rating deck:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Gets the authenticated user's rating for a specific deck.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetMyDeckRating = async (c) => {
  try {
    const user = c.get('user')
    const { key } = c.req.param()

    const result = await c.env.DB.prepare(
      `SELECT rating FROM deck_ratings WHERE deck_key = ? AND user_id = ?`
    )
      .bind(key, user.id)
      .first()

    return c.json({ rating: result ? result.rating : 0 })
  } catch (error) {
    console.error('Error fetching my deck rating:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}
