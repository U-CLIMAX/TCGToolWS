import { customAlphabet } from 'nanoid'
import { createErrorResponse } from './utils.js'

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

    if (!shop_url.startsWith('https://')) {
      return createErrorResponse(c, 400, '商品链接必须以 https:// 开头')
    }

    const ensureJsonString = (val) => (typeof val === 'string' ? val : JSON.stringify(val))
    const cardsIdStr = ensureJsonString(cards_id)
    const climaxTypesStr = ensureJsonString(climax_types)
    const tagsStr = ensureJsonString(tags || [])

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const nanoid = customAlphabet(alphabet, 8)
    const id = nanoid()
    const now = Date.now()

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
 * Retrieves market listings with pagination and filters.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetListings = async (c) => {
  try {
    const { page = 1, limit = 20, series, mine, sort = 'newest' } = c.req.query()

    const offset = (page - 1) * limit
    const conditions = []
    const params = []

    if (mine === 'true') {
      const user = c.get('user')
      if (!user) {
        return createErrorResponse(c, 401, '请先登录')
      }
      conditions.push('user_id = ?')
      params.push(user.id)
    }

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

    let orderBy = 'updated_at DESC'
    if (sort === 'price_asc') orderBy = 'price ASC'
    if (sort === 'price_desc') orderBy = 'price DESC'

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const query = `
      SELECT id, user_id, series_name, cards_id, climax_types, tags, price, shop_url, deck_code, updated_at
      FROM market_listings
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `

    const countQuery = `SELECT COUNT(*) as total FROM market_listings ${whereClause}`

    // Execute queries
    const { results } = await c.env.DB.prepare(query)
      .bind(...params, parseInt(limit), parseInt(offset))
      .all()

    const totalResult = await c.env.DB.prepare(countQuery)
      .bind(...params)
      .first()

    // Parse JSON fields for response
    const listings = results.map((l) => ({
      ...l,
      cards_id: JSON.parse(l.cards_id),
      climax_types: JSON.parse(l.climax_types),
      tags: JSON.parse(l.tags || '[]'),
    }))

    return c.json({
      listings,
      total: totalResult.total,
      page: parseInt(page),
      limit: parseInt(limit),
    })
  } catch (error) {
    console.error('Error fetching listings:', error)
    return createErrorResponse(c, 500, '内部服务器错误')
  }
}

/**
 * Retrieves listings created by the authenticated user.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleGetUserListings = async (c) => {
  try {
    const user = c.get('user')

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM market_listings WHERE user_id = ? ORDER BY updated_at DESC'
    )
      .bind(user.id)
      .all()

    const listings = results.map((l) => ({
      ...l,
      cards_id: JSON.parse(l.cards_id),
      climax_types: JSON.parse(l.climax_types),
      tags: JSON.parse(l.tags || '[]'),
    }))

    return c.json({ listings })
  } catch (error) {
    console.error('Error fetching user listings:', error)
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
