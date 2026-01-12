import { customAlphabet } from 'nanoid'
import { createErrorResponse } from './utils.js'
import { getMarketStats } from '../services/market-stats.js'

/**
 * Creates a new market listing.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleCreateListing = async (c) => {
  try {
    const user = c.get('user')
    const { series_name, cards_id, climax_types, tags, price, shop_url, deck_code } =
      await c.req.json()

    // Validation
    if (!series_name || !cards_id || !climax_types || price === undefined || !shop_url) {
      return createErrorResponse(c, 400, '缺少必要参数')
    }

    // Check listing limit based on role
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM market_listings WHERE user_id = ?'
    )
      .bind(user.id)
      .first()

    const currentCount = countResult.total
    let limit = Infinity
    if (user.role === 0) limit = 5
    else if (user.role === 1) limit = 50

    if (currentCount >= limit) {
      return createErrorResponse(c, 403, `已达发布上限 (${limit} 个)`)
    }

    const ensureJsonString = (val) => (typeof val === 'string' ? val : JSON.stringify(val))
    const cardsIdStr = ensureJsonString(cards_id)
    const climaxTypesStr = ensureJsonString(climax_types)
    const tagsStr = ensureJsonString(tags || [])

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const nanoid = customAlphabet(alphabet, 8)
    const id = nanoid()
    const now = Math.floor(Date.now() / 1000)

    const info = await c.env.DB.prepare(
      `INSERT INTO market_listings (id, user_id, series_name, cards_id, climax_types, tags, price, shop_url, deck_code, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        user.id,
        series_name,
        cardsIdStr,
        climaxTypesStr,
        tagsStr,
        price,
        shop_url,
        deck_code || '',
        now
      )
      .run()

    if (!info.success) {
      return createErrorResponse(c, 500, '数据库操作失败')
    }

    return c.json({ success: true, id }, 201)
  } catch (error) {
    console.error('Error creating listing:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Updates an existing market listing.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleUpdateListing = async (c) => {
  try {
    const user = c.get('user')
    const { id } = c.req.param()
    const { series_name, cards_id, climax_types, tags, price, shop_url, deck_code } =
      await c.req.json()

    if (!id) return createErrorResponse(c, 400, '缺少 ID')

    // Validation
    if (!series_name || !cards_id || !climax_types || price === undefined || !shop_url) {
      return createErrorResponse(c, 400, '缺少必要参数')
    }

    const ensureJsonString = (val) => (typeof val === 'string' ? val : JSON.stringify(val))
    const cardsIdStr = ensureJsonString(cards_id)
    const climaxTypesStr = ensureJsonString(climax_types)
    const tagsStr = ensureJsonString(tags || [])
    const now = Math.floor(Date.now() / 1000)

    const info = await c.env.DB.prepare(
      `UPDATE market_listings
       SET series_name = ?, cards_id = ?, climax_types = ?, tags = ?, price = ?, shop_url = ?, deck_code = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    )
      .bind(
        series_name,
        cardsIdStr,
        climaxTypesStr,
        tagsStr,
        price,
        shop_url,
        deck_code || '',
        now,
        id,
        user.id
      )
      .run()

    if (!info.success) {
      return createErrorResponse(c, 500, '数据库操作失败')
    }

    if (info.changes === 0) {
      return createErrorResponse(c, 404, '商品未找到或无权编辑')
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Error updating listing:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Retrieves market listings with cursor-based pagination.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetListings = async (c) => {
  try {
    const { limit, series, sort = 'newest', cursor } = c.req.query()
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20))

    // Decode cursor if present
    let cursorObj = null
    if (cursor) cursorObj = JSON.parse(atob(cursor))

    const conditions = []
    const params = []

    const tagsQuery = c.req.queries('tag')
    if (tagsQuery && tagsQuery.length > 0) {
      const tagConditions = tagsQuery.map(() => 'tags LIKE ?').join(' OR ')
      conditions.push(`(${tagConditions})`)
      tagsQuery.forEach((t) => params.push(`%${t}%`))
    }

    if (series) {
      conditions.push('series_name = ?')
      params.push(series)
    }

    const climaxQuery = c.req.queries('climax')
    if (climaxQuery && climaxQuery.length > 0) {
      const climaxConditions = climaxQuery.map(() => 'climax_types LIKE ?').join(' OR ')
      conditions.push(`(${climaxConditions})`)
      climaxQuery.forEach((c) => params.push(`%"${c}"%`))
    }

    let orderByClause = 'updated_at DESC, id DESC'
    let cursorCondition = ''

    // Apply cursor filter based on sort method
    if (sort === 'price_asc') {
      orderByClause = 'price ASC, id ASC'
      if (cursorObj) {
        cursorCondition = '(price, id) > (?, ?)'
        params.push(cursorObj.p, cursorObj.i)
      }
    } else if (sort === 'price_desc') {
      orderByClause = 'price DESC, id DESC'
      if (cursorObj) {
        cursorCondition = '(price, id) < (?, ?)'
        params.push(cursorObj.p, cursorObj.i)
      }
    } else {
      // Default: newest (updated_at DESC)
      orderByClause = 'updated_at DESC, id DESC'
      if (cursorObj) {
        cursorCondition = '(updated_at, id) < (?, ?)'
        params.push(cursorObj.t, cursorObj.i)
      }
    }

    if (cursorCondition) {
      conditions.push(cursorCondition)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT id, user_id, series_name, cards_id, climax_types, tags, price, shop_url, deck_code, updated_at
      FROM market_listings
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ?
    `

    // Fetch one extra item to check if there is a next page
    const { results } = await c.env.DB.prepare(query)
      .bind(...params, limitNum + 1)
      .all()

    const hasNextPage = results.length > limitNum
    const listings = hasNextPage ? results.slice(0, limitNum) : results

    // Generate next cursor
    let nextCursor = null
    if (hasNextPage && listings.length > 0) {
      const lastItem = listings[listings.length - 1]
      let nextCursorObj = {}

      if (sort === 'price_asc' || sort === 'price_desc') {
        nextCursorObj = { p: lastItem.price, i: lastItem.id }
      } else {
        nextCursorObj = { t: lastItem.updated_at, i: lastItem.id }
      }

      nextCursor = btoa(JSON.stringify(nextCursorObj))
    }

    // Parse JSON fields for response
    const parsedListings = listings.map((l) => ({
      ...l,
      cards_id: JSON.parse(l.cards_id),
      climax_types: JSON.parse(l.climax_types),
      tags: JSON.parse(l.tags || '[]'),
    }))

    return c.json({
      listings: parsedListings,
      nextCursor,
      limit: limitNum,
    })
  } catch (error) {
    console.error('Error fetching listings:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Retrieves listings created by the authenticated user with cursor-based pagination.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetUserListings = async (c) => {
  try {
    const user = c.get('user')
    const { limit, series, sort = 'newest', cursor } = c.req.query()

    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20))

    // Decode cursor if present
    let cursorObj = null
    if (cursor) cursorObj = JSON.parse(atob(cursor))

    const conditions = ['user_id = ?']
    const params = [user.id]

    const tagsQuery = c.req.queries('tag')
    if (tagsQuery && tagsQuery.length > 0) {
      const tagConditions = tagsQuery.map(() => 'tags LIKE ?').join(' OR ')
      conditions.push(`(${tagConditions})`)
      tagsQuery.forEach((t) => params.push(`%${t}%`))
    }

    if (series) {
      conditions.push('series_name = ?')
      params.push(series)
    }

    const climaxQuery = c.req.queries('climax')
    if (climaxQuery && climaxQuery.length > 0) {
      const climaxConditions = climaxQuery.map(() => 'climax_types LIKE ?').join(' OR ')
      conditions.push(`(${climaxConditions})`)
      climaxQuery.forEach((c) => params.push(`%"${c}"%`))
    }

    let orderByClause = 'updated_at DESC, id DESC'
    let cursorCondition = ''

    if (sort === 'price_asc') {
      orderByClause = 'price ASC, id ASC'
      if (cursorObj) {
        cursorCondition = '(price, id) > (?, ?)'
        params.push(cursorObj.p, cursorObj.i)
      }
    } else if (sort === 'price_desc') {
      orderByClause = 'price DESC, id DESC'
      if (cursorObj) {
        cursorCondition = '(price, id) < (?, ?)'
        params.push(cursorObj.p, cursorObj.i)
      }
    } else {
      // Default: newest
      orderByClause = 'updated_at DESC, id DESC'
      if (cursorObj) {
        cursorCondition = '(updated_at, id) < (?, ?)'
        params.push(cursorObj.t, cursorObj.i)
      }
    }

    if (cursorCondition) {
      conditions.push(cursorCondition)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    const query = `
      SELECT id, user_id, series_name, cards_id, climax_types, tags, price, shop_url, deck_code, updated_at
      FROM market_listings
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ?
    `

    // Fetch one extra item
    const { results } = await c.env.DB.prepare(query)
      .bind(...params, limitNum + 1)
      .all()

    const hasNextPage = results.length > limitNum
    const listings = hasNextPage ? results.slice(0, limitNum) : results

    // Generate next cursor
    let nextCursor = null
    if (hasNextPage && listings.length > 0) {
      const lastItem = listings[listings.length - 1]
      let nextCursorObj = {}

      if (sort === 'price_asc' || sort === 'price_desc') {
        nextCursorObj = { p: lastItem.price, i: lastItem.id }
      } else {
        nextCursorObj = { t: lastItem.updated_at, i: lastItem.id }
      }

      nextCursor = btoa(JSON.stringify(nextCursorObj))
    }

    // Parse JSON fields
    const parsedListings = listings.map((l) => ({
      ...l,
      cards_id: JSON.parse(l.cards_id),
      climax_types: JSON.parse(l.climax_types),
      tags: JSON.parse(l.tags || '[]'),
    }))

    return c.json({
      listings: parsedListings,
      nextCursor,
      limit: limitNum,
    })
  } catch (error) {
    console.error('Error fetching user listings:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Retrieves the count of listings created by the authenticated user.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetMyListingCount = async (c) => {
  try {
    const user = c.get('user')
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM market_listings WHERE user_id = ?'
    )
      .bind(user.id)
      .first()

    return c.json({ count: result.total })
  } catch (error) {
    console.error('Error fetching listing count:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Deletes a market listing.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleDeleteListing = async (c) => {
  try {
    const user = c.get('user')
    const { id } = c.req.param()

    if (!id) return createErrorResponse(c, 400, '缺少 ID')

    const info = await c.env.DB.prepare('DELETE FROM market_listings WHERE id = ? AND user_id = ?')
      .bind(id, user.id)
      .run()

    if (!info.success) return createErrorResponse(c, 500, '数据库操作失败')
    if (info.changes === 0) return createErrorResponse(c, 404, '商品未找到或无权删除')

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting listing:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Retrieves market statistics.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetMarketStats = async (c) => {
  const stats = await getMarketStats(c.env)
  return c.json(
    stats || {
      updated_at: Math.floor(Date.now() / 1000),
      total_series: 0,
      top10: [],
    }
  )
}
