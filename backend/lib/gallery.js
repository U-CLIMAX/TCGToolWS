import { createErrorResponse } from './utils.js'

/**
 * Retrieves decks from the gallery with cursor-based pagination and filtering.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetDecksGallery = async (c) => {
  try {
    const {
      limit,
      series,
      game_type,
      sort = 'newest',
      cursor,
      tournament_type,
      participant_count,
      placement,
      has_article,
    } = c.req.query()
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20))

    let cursorObj = null
    if (cursor) cursorObj = JSON.parse(atob(cursor))

    const conditions = ['game_type = ?1']
    const params = [game_type]

    if (series) {
      conditions.push(`series_id = ?${params.length + 1}`)
      params.push(series)
    }

    if (tournament_type === 'any') {
      conditions.push('tournament_type IS NOT NULL')
    } else if (tournament_type) {
      conditions.push(`tournament_type = ?${params.length + 1}`)
      params.push(tournament_type)
    }

    if (participant_count) {
      conditions.push(`participant_count = ?${params.length + 1}`)
      params.push(participant_count)
    }

    if (placement) {
      conditions.push(`placement = ?${params.length + 1}`)
      params.push(placement)
    }

    if (has_article === 'true') {
      conditions.push('article_link IS NOT NULL AND article_link != ""')
    }

    let orderByClause = 'updated_at DESC, key DESC'
    let cursorCondition = ''

    // Configure order and cursor based on sort type
    if (sort === 'oldest') {
      orderByClause = 'updated_at ASC, key ASC'
      if (cursorObj) {
        cursorCondition = `(updated_at, key) > (?${params.length + 1}, ?${params.length + 2})`
        params.push(cursorObj.t, cursorObj.k)
      }
    } else if (sort === 'rating_desc') {
      orderByClause = 'rating_avg DESC, updated_at DESC, key DESC'
      if (cursorObj) {
        cursorCondition = `(rating_avg, updated_at, key) < (?${params.length + 1}, ?${params.length + 2}, ?${params.length + 3})`
        params.push(cursorObj.r || 0, cursorObj.t, cursorObj.k)
      }
    } else if (sort === 'rating_asc') {
      orderByClause = 'rating_avg ASC, updated_at DESC, key DESC'
      if (cursorObj) {
        cursorCondition = `((rating_avg > ?${params.length + 1}) OR (rating_avg = ?${params.length + 2} AND (updated_at < ?${params.length + 3} OR (updated_at = ?${params.length + 4} AND key < ?${params.length + 5}))))`
        params.push(cursorObj.r || 0, cursorObj.r || 0, cursorObj.t, cursorObj.t, cursorObj.k)
      }
    } else {
      // Default: newest
      orderByClause = 'updated_at DESC, key DESC'
      if (cursorObj) {
        cursorCondition = `(updated_at, key) < (?${params.length + 1}, ?${params.length + 2})`
        params.push(cursorObj.t, cursorObj.k)
      }
    }

    if (cursorCondition) {
      conditions.push(cursorCondition)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT key, user_id, deck_name, series_id, game_type, cover_cards_id, climax_cards_id, updated_at, rating_avg, tournament_type, participant_count, placement, article_link
      FROM decks_gallery
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ?${params.length + 1}
    `

    const { results } = await c.env.DB.prepare(query)
      .bind(...params, limitNum + 1)
      .all()

    const hasNextPage = results.length > limitNum
    const decks = hasNextPage ? results.slice(0, limitNum) : results

    let nextCursor = null
    if (hasNextPage && decks.length > 0) {
      const lastItem = decks[decks.length - 1]
      const cursorData = { t: lastItem.updated_at, k: lastItem.key }
      if (sort.startsWith('rating')) {
        cursorData.r = lastItem.rating_avg || 0
      }
      nextCursor = btoa(JSON.stringify(cursorData))
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
    return createErrorResponse(c, 500, '服务器内部错误')
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
    const {
      limit,
      series,
      game_type,
      sort = 'newest',
      cursor,
      tournament_type,
      participant_count,
      placement,
      has_article,
    } = c.req.query()
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20))

    let cursorObj = null
    if (cursor) cursorObj = JSON.parse(atob(cursor))

    const conditions = ['user_id = ?1', 'game_type = ?2']
    const params = [user.id, game_type]

    if (series) {
      conditions.push(`series_id = ?${params.length + 1}`)
      params.push(series)
    }

    if (tournament_type === 'any') {
      conditions.push('tournament_type IS NOT NULL')
    } else if (tournament_type) {
      conditions.push(`tournament_type = ?${params.length + 1}`)
      params.push(tournament_type)
    }

    if (participant_count) {
      conditions.push(`participant_count = ?${params.length + 1}`)
      params.push(participant_count)
    }

    if (placement) {
      conditions.push(`placement = ?${params.length + 1}`)
      params.push(placement)
    }

    if (has_article === 'true') {
      conditions.push('article_link IS NOT NULL AND article_link != ""')
    }

    let orderByClause = 'updated_at DESC, key DESC'
    let cursorCondition = ''

    if (sort === 'oldest') {
      orderByClause = 'updated_at ASC, key ASC'
      if (cursorObj) {
        cursorCondition = `(updated_at, key) > (?${params.length + 1}, ?${params.length + 2})`
        params.push(cursorObj.t, cursorObj.k)
      }
    } else if (sort === 'rating_desc') {
      orderByClause = 'rating_avg DESC, updated_at DESC, key DESC'
      if (cursorObj) {
        cursorCondition = `(rating_avg, updated_at, key) < (?${params.length + 1}, ?${params.length + 2}, ?${params.length + 3})`
        params.push(cursorObj.r || 0, cursorObj.t, cursorObj.k)
      }
    } else if (sort === 'rating_asc') {
      orderByClause = 'rating_avg ASC, updated_at DESC, key DESC'
      if (cursorObj) {
        cursorCondition = `((rating_avg > ?${params.length + 1}) OR (rating_avg = ?${params.length + 2} AND (updated_at < ?${params.length + 3} OR (updated_at = ?${params.length + 4} AND key < ?${params.length + 5}))))`
        params.push(cursorObj.r || 0, cursorObj.r || 0, cursorObj.t, cursorObj.t, cursorObj.k)
      }
    } else {
      // Default: newest
      orderByClause = 'updated_at DESC, key DESC'
      if (cursorObj) {
        cursorCondition = `(updated_at, key) < (?${params.length + 1}, ?${params.length + 2})`
        params.push(cursorObj.t, cursorObj.k)
      }
    }

    if (cursorCondition) {
      conditions.push(cursorCondition)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    const query = `
      SELECT key, user_id, deck_name, series_id, game_type, cover_cards_id, climax_cards_id, updated_at, rating_avg, tournament_type, participant_count, placement, article_link
      FROM decks_gallery
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ?${params.length + 1}
    `

    const { results } = await c.env.DB.prepare(query)
      .bind(...params, limitNum + 1)
      .all()

    const hasNextPage = results.length > limitNum
    const decks = hasNextPage ? results.slice(0, limitNum) : results

    let nextCursor = null
    if (hasNextPage && decks.length > 0) {
      const lastItem = decks[decks.length - 1]
      const cursorData = { t: lastItem.updated_at, k: lastItem.key }
      if (sort.startsWith('rating')) {
        cursorData.r = lastItem.rating_avg || 0
      }
      nextCursor = btoa(JSON.stringify(cursorData))
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
    return createErrorResponse(c, 500, '服务器内部错误')
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

    const info = await c.env.DB.prepare('DELETE FROM decks_gallery WHERE key = ?1 AND user_id = ?2')
      .bind(key, user.id)
      .run()

    if (!info.success) return createErrorResponse(c, 500, '数据库操作失败')
    if (info.changes === 0) return createErrorResponse(c, 404, '卡组未找到或无权删除')

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting gallery deck:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Gets the total count of gallery decks for the authenticated user.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetMyGalleryCount = async (c) => {
  try {
    const user = c.get('user')
    const { count } = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM decks_gallery WHERE user_id = ?1'
    )
      .bind(user.id)
      .first()

    return c.json({ count: count || 0 })
  } catch (error) {
    console.error('Error fetching gallery count:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
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

    if (
      !key ||
      rating === undefined ||
      rating === null ||
      (rating !== 0 && (rating < 1 || rating > 5))
    ) {
      return createErrorResponse(c, 400, '参数错误')
    }

    const now = Math.floor(Date.now() / 1000)

    if (rating === 0) {
      // Remove rating
      await c.env.DB.prepare('DELETE FROM deck_ratings WHERE deck_key = ?1 AND user_id = ?2')
        .bind(key, user.id)
        .run()
    } else {
      // Upsert rating
      await c.env.DB.prepare(
        `INSERT INTO deck_ratings (deck_key, user_id, rating, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(deck_key, user_id) DO UPDATE SET
         rating = excluded.rating,
         updated_at = excluded.updated_at`
      )
        .bind(key, user.id, rating, now)
        .run()
    }

    // Recalculate average and total count
    const { avgRating, count } = await c.env.DB.prepare(
      `SELECT AVG(rating) as avgRating, COUNT(*) as count FROM deck_ratings WHERE deck_key = ?1`
    )
      .bind(key)
      .first()

    // Fetch rating breakdown (1-5 stars)
    const { results } = await c.env.DB.prepare(
      `SELECT rating, COUNT(*) as count FROM deck_ratings WHERE deck_key = ?1 GROUP BY rating`
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

    // Update gallery record with new stats
    await c.env.DB.prepare(
      `UPDATE decks_gallery SET rating_avg = ?1, rating_count = ?2, rating_breakdown = ?3 WHERE key = ?4`
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
    return createErrorResponse(c, 500, '服务器内部错误')
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
      `SELECT rating FROM deck_ratings WHERE deck_key = ?1 AND user_id = ?2`
    )
      .bind(key, user.id)
      .first()

    return c.json({ rating: result ? result.rating : 0 })
  } catch (error) {
    console.error('Error fetching my deck rating:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Updates metadata for a gallery deck.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleUpdateGalleryDeckMetadata = async (c) => {
  try {
    const user = c.get('user')
    const { key } = c.req.param()
    const { tournamentType, participantCount, placement, articleLink } = await c.req.json()

    if (!key) return createErrorResponse(c, 400, '缺少 key')

    const now = Math.floor(Date.now() / 1000)

    const info = await c.env.DB.prepare(
      `UPDATE decks_gallery SET
       tournament_type = ?1,
       participant_count = ?2,
       placement = ?3,
       article_link = ?4,
       updated_at = ?5
       WHERE key = ?6 AND user_id = ?7`
    )
      .bind(
        tournamentType || null,
        participantCount || null,
        placement || null,
        articleLink || null,
        now,
        key,
        user.id
      )
      .run()

    if (!info.success) return createErrorResponse(c, 500, '数据库操作失败')
    if (info.changes === 0) return createErrorResponse(c, 404, '卡组未找到或无权更新')

    return c.json({ success: true })
  } catch (error) {
    console.error('Error updating gallery deck metadata:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}
