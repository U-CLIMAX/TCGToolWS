import { createErrorResponse } from './utils.js'

/**
 * Retrieves all notices from the database.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export async function handleGetNotices(c) {
  const db = c.env.DB
  try {
    const { results } = await db.prepare('SELECT * FROM notices ORDER BY updated_at DESC').all()
    return c.json(results)
  } catch (err) {
    console.error('Failed to fetch notices:', err)
    return createErrorResponse(c, 500, '获取公告失败')
  }
}

/**
 * Creates a new notice. Requires admin role (role === 2).
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export async function handleCreateNotice(c) {
  const user = c.get('user')

  // Security: Ensure user has admin privileges
  if (!user || user.role !== 2) {
    return createErrorResponse(c, 403, '权限不足：需要管理员权限')
  }

  const db = c.env.DB
  try {
    const { id, title, content, is_important, updated_at } = await c.req.json()

    if (!title || !content) {
      return createErrorResponse(c, 400, '标题和内容为必填项')
    }

    const noticeId = id || Math.random().toString(36).substring(2, 11)
    const timestamp = updated_at || Date.now()

    await db
      .prepare(
        'INSERT INTO notices (id, title, content, is_important, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)'
      )
      .bind(noticeId, title, content, is_important || 0, timestamp)
      .run()

    return c.json({ success: true })
  } catch (err) {
    console.error('Failed to create notice:', err)
    return createErrorResponse(c, 500, '创建公告失败')
  }
}

/**
 * Deletes a notice by ID. Requires admin role (role === 2).
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export async function handleDeleteNotice(c) {
  const user = c.get('user')

  // Security: Ensure user has admin privileges
  if (!user || user.role !== 2) {
    return createErrorResponse(c, 403, '权限不足：需要管理员权限')
  }

  const id = c.req.param('id')
  const db = c.env.DB

  try {
    const info = await db.prepare('DELETE FROM notices WHERE id = ?1').bind(id).run()
    if (info.changes === 0) {
      return createErrorResponse(c, 404, '公告未找到')
    }
    return c.json({ success: true })
  } catch (err) {
    console.error('Failed to delete notice:', err)
    return createErrorResponse(c, 500, '删除公告失败')
  }
}
