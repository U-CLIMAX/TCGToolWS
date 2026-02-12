import { createErrorResponse } from './utils.js'
import { fetchDecklogData } from '../services/decklog.js'

/**
 * Creates a new deck entry in the database.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleCreateDeck = async (c) => {
  try {
    const { key, deckData, name, seriesId, coverCardId, history, isDeckGallery, climaxCardsId } =
      await c.req.json()

    if (isDeckGallery && !climaxCardsId) {
      return createErrorResponse(c, 400, '分享至广场需要 climaxCardsId')
    } else if (!key || !deckData || !name || !seriesId || !coverCardId) {
      return createErrorResponse(c, 400, '缺少必要参数')
    }

    const user = c.get('user')
    const tableName = isDeckGallery ? 'decks_gallery' : 'decks'

    // 檢查用戶現有的牌組數量
    const { count } = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE user_id = ?`
    )
      .bind(user.id)
      .first()

    const MAX_DECKS_PER_USER = 15
    if (count >= MAX_DECKS_PER_USER && user.role === 0) {
      const msg = isDeckGallery ? '分享' : '储存'
      return createErrorResponse(c, 403, `最多只能${msg} ${MAX_DECKS_PER_USER} 副卡组`)
    }

    const coverCardIdStr = JSON.stringify(coverCardId)
    const deckDataArray = new Uint8Array(Object.values(deckData))
    const now = Math.floor(Date.now() / 1000)

    let info
    if (isDeckGallery) {
      const climaxCardsIdStr = JSON.stringify(climaxCardsId)
      info = await c.env.DB.prepare(
        `INSERT INTO decks_gallery (key, user_id, deck_name, series_id, cover_cards_id, climax_cards_id, deck_data, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
        deck_name = excluded.deck_name,
        series_id = excluded.series_id,
        cover_cards_id = excluded.cover_cards_id,
        climax_cards_id = excluded.climax_cards_id,
        deck_data = excluded.deck_data,
        updated_at = excluded.updated_at`
      )
        .bind(key, user.id, name, seriesId, coverCardIdStr, climaxCardsIdStr, deckDataArray, now)
        .run()
    } else {
      const historyArray = new Uint8Array(Object.values(history || []))
      info = await c.env.DB.prepare(
        `INSERT INTO decks (key, user_id, deck_name, series_id, cover_cards_id, deck_data, history, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
        deck_name = excluded.deck_name,
        series_id = excluded.series_id,
        cover_cards_id = excluded.cover_cards_id,
        deck_data = excluded.deck_data,
        history = excluded.history,
        updated_at = excluded.updated_at`
      )
        .bind(key, user.id, name, seriesId, coverCardIdStr, deckDataArray, historyArray, now)
        .run()
    }

    if (!info.success) {
      return createErrorResponse(c, 500, '数据库操作失败')
    }
    return c.json({ success: true }, 201)
  } catch (error) {
    console.error('Error creating deck:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
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
      'SELECT key, deck_name, series_id, cover_cards_id, deck_data, history, updated_at FROM decks WHERE user_id = ?'
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
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Retrieves a specific deck by its key for the authenticated user.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetDeckByKey = async (c) => {
  try {
    const { key } = c.req.param()

    let result = await c.env.DB.prepare(
      'SELECT key, deck_name, series_id, cover_cards_id, deck_data, rating_avg, rating_count, rating_breakdown FROM decks_gallery WHERE key = ?'
    )
      .bind(key)
      .first()

    if (!result) {
      result = await c.env.DB.prepare(
        'SELECT key, deck_name, series_id, cover_cards_id, deck_data, history FROM decks WHERE key = ?'
      )
        .bind(key)
        .first()
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

    if (!result) {
      return createErrorResponse(c, 404, '卡组不存在')
    }

    return c.json(result)
  } catch (error) {
    console.error('Error fetching deck:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Deletes a deck entry from the database.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleDeleteDeck = async (c) => {
  try {
    const user = c.get('user')
    const { key } = c.req.param()

    if (!key) {
      return createErrorResponse(c, 400, '缺少必要参数 key')
    }

    const info = await c.env.DB.prepare('DELETE FROM decks WHERE user_id = ? AND key = ?')
      .bind(user.id, key)
      .run()

    if (!info.success) {
      console.error('D1 Delete failed:', info.error)
      return createErrorResponse(c, 500, '数据库操作失败')
    }

    if (info.changes === 0) {
      return createErrorResponse(c, 404, '卡组未找到或无权限删除')
    }

    return c.json({ success: true }, 200)
  } catch (error) {
    console.error('Error deleting deck:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Updates an existing deck entry in the database.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleUpdateDeck = async (c) => {
  try {
    const { key } = c.req.param()
    const { deckData, name, seriesId, coverCardId, history } = await c.req.json()

    if (!key || !deckData || !name || !seriesId || !coverCardId) {
      return createErrorResponse(c, 400, '缺少重要参数')
    }

    const user = c.get('user')
    const coverCardIdStr = JSON.stringify(coverCardId)
    const deckDataArray = new Uint8Array(Object.values(deckData))
    const historyArray = new Uint8Array(Object.values(history || []))

    const now = Math.floor(Date.now() / 1000)
    const info = await c.env.DB.prepare(
      `UPDATE decks SET deck_name = ?, series_id = ?, cover_cards_id = ?, deck_data = ?, history = ?, updated_at = ? WHERE key = ? AND user_id = ?`
    )
      .bind(name, seriesId, coverCardIdStr, deckDataArray, historyArray, now, key, user.id)
      .run()

    if (!info.success) {
      return createErrorResponse(c, 500, '数据库操作失败')
    }

    if (info.changes === 0) {
      return createErrorResponse(c, 404, '卡组未找到或无权限更新')
    }

    return c.json({ success: true }, 200)
  } catch (error) {
    console.error('Error updating deck:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * 處理獲取 Decklog JSON 資料的請求
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetDecklogData = async (c) => {
  try {
    const { key } = c.req.param()

    if (!key) {
      return createErrorResponse(c, 400, '缺少 Decklog Key')
    }

    // 呼叫 Service 獲取 JSON
    const deckData = await fetchDecklogData(key)
    if (!deckData || !deckData.list || !deckData.title) {
      return createErrorResponse(c, 500, '无法获取 Decklog 资料，请确认代码是否正确')
    }

    // 回傳成功資料
    return c.json({ success: true, data: { deckList: deckData.list, title: deckData.title } })
  } catch (error) {
    console.error('Error fetching decklog data:', error)
    return createErrorResponse(c, 500, '无法获取 Decklog 资料，请确认代码是否正确')
  }
}
