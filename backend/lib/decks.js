import { createErrorResponse } from './utils.js'
import { fetchDecklogData } from '../services/decklog.js'
import { parseTokens } from '../services/scraper.js'

/**
 * Creates a new deck entry in the database.
 * @param {AppContext} c - Hono context object.
 * @returns {Response}
 */
export const handleCreateDeck = async (c) => {
  try {
    const {
      key,
      deckData,
      name,
      seriesId,
      game_type,
      coverCardId,
      history,
      isDeckGallery,
      climaxCardsId,
      tournamentType,
      participantCount,
      placement,
      articleLink,
      tags,
    } = await c.req.json()

    if (isDeckGallery && !climaxCardsId) {
      return createErrorResponse(c, 400, '分享至广场需要 climaxCardsId')
    } else if (!key || !deckData || !name || !seriesId || !coverCardId) {
      return createErrorResponse(c, 400, '缺少必要参数')
    }

    if (tags && Array.isArray(tags) && (tags.length > 2 || tags.some((tag) => tag.length > 5))) {
      return createErrorResponse(c, 400, '最多只能设置 2 个标签，且每个标签长度最多 5 个字')
    }

    const user = c.get('user')
    const tableName = isDeckGallery === true ? 'decks_gallery' : 'decks'

    // Check existing deck count for the user
    const { count } = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE user_id = ?1`
    )
      .bind(user.id)
      .first()

    const MAX_DECKS_PER_USER = 15
    if (count >= MAX_DECKS_PER_USER && user.role === 0) {
      const msg = isDeckGallery ? '分享' : '存储'
      return createErrorResponse(c, 403, `最多只能${msg} ${MAX_DECKS_PER_USER} 副卡组`)
    }

    const coverCardIdStr = JSON.stringify(coverCardId)
    const deckDataArray = new Uint8Array(Object.values(deckData))
    const now = Math.floor(Date.now() / 1000)

    let info
    if (isDeckGallery) {
      const climaxCardsIdStr = JSON.stringify(climaxCardsId)
      info = await c.env.DB.prepare(
        `INSERT INTO decks_gallery (key, user_id, deck_name, series_id, game_type, cover_cards_id, climax_cards_id, deck_data, updated_at, tournament_type, participant_count, placement, article_link)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
        ON CONFLICT(key) DO UPDATE SET
        deck_name = excluded.deck_name,
        series_id = excluded.series_id,
        game_type = excluded.game_type,
        cover_cards_id = excluded.cover_cards_id,
        climax_cards_id = excluded.climax_cards_id,
        deck_data = excluded.deck_data,
        updated_at = excluded.updated_at,
        tournament_type = excluded.tournament_type,
        participant_count = excluded.participant_count,
        placement = excluded.placement,
        article_link = excluded.article_link`
      )
        .bind(
          key,
          user.id,
          name,
          seriesId,
          game_type,
          coverCardIdStr,
          climaxCardsIdStr,
          deckDataArray,
          now,
          tournamentType || null,
          participantCount || null,
          placement || null,
          articleLink || null
        )
        .run()
    } else {
      const tagsStr = tags ? JSON.stringify(tags) : null
      const historyArray = new Uint8Array(Object.values(history || []))
      info = await c.env.DB.prepare(
        `INSERT INTO decks (key, user_id, deck_name, series_id, game_type, cover_cards_id, deck_data, history, tags, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        ON CONFLICT(key) DO UPDATE SET
        deck_name = excluded.deck_name,
        series_id = excluded.series_id,
        game_type = excluded.game_type,
        cover_cards_id = excluded.cover_cards_id,
        deck_data = excluded.deck_data,
        history = excluded.history,
        tags = excluded.tags,
        updated_at = excluded.updated_at`
      )
        .bind(
          key,
          user.id,
          name,
          seriesId,
          game_type,
          coverCardIdStr,
          deckDataArray,
          historyArray,
          tagsStr,
          now
        )
        .run()
    }

    if (!info.success) {
      return createErrorResponse(c, 500, '数据库操作失败')
    }
    return c.json({ success: true }, 201)
  } catch (error) {
    console.error('Error creating deck:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Retrieves all decks for the authenticated user.
 * @param {AppContext} c - Hono context object.
 * @returns {Response}
 */
export const handleGetDecks = async (c) => {
  try {
    const user = c.get('user')
    const { limit, game_type, cursor, search, series, tags } = c.req.query()

    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 24))

    let cursorObj = null
    if (cursor) {
      try {
        cursorObj = JSON.parse(atob(cursor))
      } catch (e) {
        console.error('Error parsing cursor:', e)
      }
    }

    const conditions = ['user_id = ?1']
    const params = [user.id]

    if (game_type) {
      conditions.push(`game_type = ?${params.length + 1}`)
      params.push(game_type)
    }

    if (search) {
      conditions.push(`deck_name LIKE ?${params.length + 1}`)
      params.push(`%${search}%`)
    }

    if (series) {
      conditions.push(`series_id = ?${params.length + 1}`)
      params.push(series)
    }

    if (tags) {
      try {
        const parsedTags = JSON.parse(tags)
        if (Array.isArray(parsedTags) && parsedTags.length > 0) {
          const tagPlaceholders = parsedTags
            .map((_, idx) => `?${params.length + 1 + idx}`)
            .join(', ')
          conditions.push(
            `EXISTS (SELECT 1 FROM json_each(decks.tags) WHERE value IN (${tagPlaceholders}))`
          )
          params.push(...parsedTags)
        }
      } catch (e) {
        console.error('Error parsing tags filter:', e)
      }
    }

    if (cursorObj) {
      conditions.push(`(updated_at, key) < (?${params.length + 1}, ?${params.length + 2})`)
      params.push(cursorObj.t || 0, cursorObj.k)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT key, deck_name, series_id, game_type, cover_cards_id, tags, updated_at
      FROM decks
      ${whereClause}
      ORDER BY updated_at DESC, key DESC
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
      const cursorData = { t: lastItem.updated_at || 0, k: lastItem.key }
      nextCursor = btoa(JSON.stringify(cursorData))
    }

    const parsedResults = decks.map((result) => {
      result.cover_cards_id = JSON.parse(result.cover_cards_id)
      result.tags = result.tags ? JSON.parse(result.tags) : []
      return result
    })

    return c.json({
      decks: parsedResults,
      nextCursor,
      limit: limitNum,
    })
  } catch (error) {
    console.error('Error fetching decks:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Retrieves decks metadata summary (unique tags, series counts, totals) for the authenticated user.
 * @param {AppContext} c - Hono context object.
 * @returns {Response}
 */
export const handleGetDecksMeta = async (c) => {
  try {
    const user = c.get('user')

    // 1. Get total counts by game_type
    const gameTypeResults = await c.env.DB.prepare(
      'SELECT game_type, COUNT(*) as count FROM decks WHERE user_id = ?1 GROUP BY game_type'
    )
      .bind(user.id)
      .all()

    const gameTypeCounts = { ws: 0, wsr: 0 }
    let totalCount = 0
    gameTypeResults.results.forEach((r) => {
      gameTypeCounts[r.game_type] = r.count
      totalCount += r.count
    })

    // 2. Get series counts
    const seriesResults = await c.env.DB.prepare(
      'SELECT series_id, COUNT(*) as count FROM decks WHERE user_id = ?1 GROUP BY series_id'
    )
      .bind(user.id)
      .all()

    const seriesCounts = {}
    seriesResults.results.forEach((r) => {
      seriesCounts[r.series_id] = r.count
    })

    // 3. Get all unique tags
    const tagsResults = await c.env.DB.prepare(
      'SELECT DISTINCT json_each.value AS tag FROM decks, json_each(decks.tags) WHERE user_id = ?1'
    )
      .bind(user.id)
      .all()

    const allTags = tagsResults.results
      .map((r) => r.tag)
      .filter(Boolean)
      .sort()

    return c.json({
      success: true,
      totalCount,
      gameTypeCounts,
      seriesCounts,
      allTags,
    })
  } catch (error) {
    console.error('Error fetching decks meta:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Retrieves a specific deck by its key (checks gallery first, then personal decks).
 * @param {AppContext} c - Hono context object.
 * @returns {Response}
 */
export const handleGetDeckByKey = async (c) => {
  try {
    const { key } = c.req.param()

    let result = await c.env.DB.prepare(
      'SELECT key, deck_name, series_id, game_type, cover_cards_id, deck_data, rating_avg, rating_count, rating_breakdown, article_link FROM decks_gallery WHERE key = ?1'
    )
      .bind(key)
      .first()

    if (!result) {
      result = await c.env.DB.prepare(
        'SELECT key, deck_name, series_id, game_type, cover_cards_id, deck_data, history, tags FROM decks WHERE key = ?1'
      )
        .bind(key)
        .first()
    }

    if (!result) {
      return createErrorResponse(c, 404, '卡组不存在')
    }

    result.cover_cards_id = JSON.parse(result.cover_cards_id)
    if (result.tags) {
      result.tags = JSON.parse(result.tags)
    } else if (result.tags === null) {
      result.tags = []
    }
    if (result.rating_breakdown) {
      try {
        result.rating_breakdown = JSON.parse(result.rating_breakdown)
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        result.rating_breakdown = [0, 0, 0, 0, 0]
      }
    }

    return c.json(result)
  } catch (error) {
    console.error('Error fetching deck:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Deletes a deck entry from the personal collection.
 * @param {AppContext} c - Hono context object.
 * @returns {Response}
 */
export const handleDeleteDeck = async (c) => {
  try {
    const user = c.get('user')
    const { key } = c.req.param()

    if (!key) return createErrorResponse(c, 400, '缺少必要参数 key')

    const info = await c.env.DB.prepare('DELETE FROM decks WHERE user_id = ?1 AND key = ?2')
      .bind(user.id, key)
      .run()

    if (!info.success) return createErrorResponse(c, 500, '数据库操作失败')
    if (info.changes === 0) return createErrorResponse(c, 404, '卡组未找到或无权限删除')

    return c.json({ success: true }, 200)
  } catch (error) {
    console.error('Error deleting deck:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Updates an existing personal deck entry.
 * @param {AppContext} c - Hono context object.
 * @returns {Response}
 */
export const handleUpdateDeck = async (c) => {
  try {
    const { key } = c.req.param()
    const { deckData, name, seriesId, game_type, coverCardId, history, tags } = await c.req.json()

    if (!key || !deckData || !name || !seriesId || !coverCardId) {
      return createErrorResponse(c, 400, '缺少重要参数')
    }

    if (tags && Array.isArray(tags) && (tags.length > 2 || tags.some((tag) => tag.length > 5))) {
      return createErrorResponse(c, 400, '最多只能设置 2 个标签，且每个标签长度最多 5 个字')
    }

    const user = c.get('user')
    const coverCardIdStr = JSON.stringify(coverCardId)
    const deckDataArray = new Uint8Array(Object.values(deckData))
    const historyArray = new Uint8Array(Object.values(history || []))
    const tagsStr = tags ? JSON.stringify(tags) : null
    const now = Math.floor(Date.now() / 1000)

    const info = await c.env.DB.prepare(
      `UPDATE decks SET deck_name = ?1, series_id = ?2, game_type = ?3, cover_cards_id = ?4, deck_data = ?5, history = ?6, tags = ?7, updated_at = ?8
       WHERE key = ?9 AND user_id = ?10`
    )
      .bind(
        name,
        seriesId,
        game_type,
        coverCardIdStr,
        deckDataArray,
        historyArray,
        tagsStr,
        now,
        key,
        user.id
      )
      .run()

    if (!info.success) return createErrorResponse(c, 500, '数据库操作失败')
    if (info.changes === 0) return createErrorResponse(c, 404, '卡组未找到或无权限更新')

    return c.json({ success: true }, 200)
  } catch (error) {
    console.error('Error updating deck:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Updates only the tags of an existing personal deck.
 * @param {AppContext} c - Hono context object.
 * @returns {Response}
 */
export const handleUpdateDeckTags = async (c) => {
  try {
    const { key } = c.req.param()
    const { tags } = await c.req.json()
    const user = c.get('user')

    if (!key || !Array.isArray(tags)) {
      return createErrorResponse(c, 400, '缺少必要参数 key 或 tags 格式不正确')
    }

    if (tags.length > 2 || tags.some((tag) => tag.length > 5)) {
      return createErrorResponse(c, 400, '最多只能设置 2 个标签，且每个标签长度最多 5 个字')
    }

    const tagsStr = JSON.stringify(tags)
    const now = Math.floor(Date.now() / 1000)

    const info = await c.env.DB.prepare(
      `UPDATE decks SET tags = ?1, updated_at = ?2 WHERE key = ?3 AND user_id = ?4`
    )
      .bind(tagsStr, now, key, user.id)
      .run()

    if (!info.success) return createErrorResponse(c, 500, '数据库操作失败')
    if (info.changes === 0) return createErrorResponse(c, 404, '卡组未找到或无权限更新标签')

    return c.json({ success: true, tags }, 200)
  } catch (error) {
    console.error('Error updating deck tags:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Retrieves deck data from Decklog service by key.
 * @param {AppContext} c - Hono context object.
 * @returns {Response}
 */
export const handleGetDecklogData = async (c) => {
  try {
    const { key } = c.req.param()
    if (!key) return createErrorResponse(c, 400, '缺少 Decklog Key')

    const scraperApiTokens = parseTokens(c.env.SCRAPER_API_KEY)
    const isProd = import.meta.env.PROD
    const deckData = await fetchDecklogData(key, scraperApiTokens, isProd)
    if (!deckData || !deckData.list || !deckData.title) {
      return createErrorResponse(c, 500, '无法获取 Decklog 资料，请确认代码是否正确')
    }

    return c.json({
      success: true,
      data: {
        deckList: deckData.list,
        title: deckData.title,
      },
    })
  } catch (error) {
    console.error('Error fetching decklog data:', error)
    return createErrorResponse(c, 500, '无法获取 Decklog 资料，请确认代码是否正确')
  }
}
