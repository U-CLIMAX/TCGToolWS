import { createErrorResponse } from './utils.js'
import { fetchDecklogData } from '../services/decklog.js'

/**
 * Creates a new deck entry in the database.
 * @param {object} c - Hono context object.
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
    } = await c.req.json()

    if (isDeckGallery && !climaxCardsId) {
      return createErrorResponse(c, 400, '分享至广场需要 climaxCardsId')
    } else if (!key || !deckData || !name || !seriesId || !coverCardId) {
      return createErrorResponse(c, 400, '缺少必要参数')
    }

    const user = c.get('user')
    const tableName = isDeckGallery ? 'decks_gallery' : 'decks'

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
      const historyArray = new Uint8Array(Object.values(history || []))
      info = await c.env.DB.prepare(
        `INSERT INTO decks (key, user_id, deck_name, series_id, game_type, cover_cards_id, deck_data, history, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(key) DO UPDATE SET
        deck_name = excluded.deck_name,
        series_id = excluded.series_id,
        game_type = excluded.game_type,
        cover_cards_id = excluded.cover_cards_id,
        deck_data = excluded.deck_data,
        history = excluded.history,
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
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetDecks = async (c) => {
  try {
    const user = c.get('user')

    const { results } = await c.env.DB.prepare(
      'SELECT key, deck_name, series_id, game_type, cover_cards_id, deck_data, history, updated_at FROM decks WHERE user_id = ?1'
    )
      .bind(user.id)
      .all()

    const parsedResults = results.map((result) => {
      result.cover_cards_id = JSON.parse(result.cover_cards_id)
      return result
    })

    return c.json(parsedResults)
  } catch (error) {
    console.error('Error fetching decks:', error)
    return createErrorResponse(c, 500, '服务器内部错误')
  }
}

/**
 * Retrieves a specific deck by its key (checks gallery first, then personal decks).
 * @param {object} c - Hono context object.
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
        'SELECT key, deck_name, series_id, game_type, cover_cards_id, deck_data, history FROM decks WHERE key = ?1'
      )
        .bind(key)
        .first()
    }

    if (!result) {
      return createErrorResponse(c, 404, '卡组不存在')
    }

    result.cover_cards_id = JSON.parse(result.cover_cards_id)
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
 * @param {object} c - Hono context object.
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
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleUpdateDeck = async (c) => {
  try {
    const { key } = c.req.param()
    const { deckData, name, seriesId, game_type, coverCardId, history } = await c.req.json()

    if (!key || !deckData || !name || !seriesId || !coverCardId) {
      return createErrorResponse(c, 400, '缺少重要参数')
    }

    const user = c.get('user')
    const coverCardIdStr = JSON.stringify(coverCardId)
    const deckDataArray = new Uint8Array(Object.values(deckData))
    const historyArray = new Uint8Array(Object.values(history || []))
    const now = Math.floor(Date.now() / 1000)

    const info = await c.env.DB.prepare(
      `UPDATE decks SET deck_name = ?1, series_id = ?2, game_type = ?3, cover_cards_id = ?4, deck_data = ?5, history = ?6, updated_at = ?7
       WHERE key = ?8 AND user_id = ?9`
    )
      .bind(
        name,
        seriesId,
        game_type,
        coverCardIdStr,
        deckDataArray,
        historyArray,
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
 * Retrieves deck data from Decklog service by key.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetDecklogData = async (c) => {
  try {
    const { key } = c.req.param()
    if (!key) return createErrorResponse(c, 400, '缺少 Decklog Key')

    const deckData = await fetchDecklogData(key)
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
