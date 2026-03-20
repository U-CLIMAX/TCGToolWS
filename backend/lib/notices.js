export async function handleGetNotices(c) {
  const db = c.env.DB
  try {
    const { results } = await db.prepare('SELECT * FROM notices ORDER BY updated_at DESC').all()
    return c.json(results)
  } catch (err) {
    console.error('Failed to fetch notices:', err)
    return c.json({ error: 'Failed to fetch notices' }, 500)
  }
}

export async function handleCreateNotice(c) {
  const user = c.get('user')
  // 檢查管理員權限 (role === 2)
  if (!user || user.role !== 2) {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403)
  }

  const db = c.env.DB
  try {
    const { id, title, content, is_important, updated_at } = await c.req.json()

    if (!title || !content) {
      return c.json({ error: 'Title and content are required' }, 400)
    }

    await db
      .prepare(
        'INSERT INTO notices (id, title, content, is_important, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(
        id || Math.random().toString(36).substring(2, 11),
        title,
        content,
        is_important || 0,
        updated_at || Date.now()
      )
      .run()

    return c.json({ success: true })
  } catch (err) {
    console.error('Failed to create notice:', err)
    return c.json({ error: 'Failed to create notice' }, 500)
  }
}

export async function handleDeleteNotice(c) {
  const user = c.get('user')
  // 檢查管理員權限 (role === 2)
  if (!user || user.role !== 2) {
    return c.json({ error: 'Unauthorized: Admin access required' }, 403)
  }

  const id = c.req.param('id')
  const db = c.env.DB

  try {
    await db.prepare('DELETE FROM notices WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (err) {
    console.error('Failed to delete notice:', err)
    return c.json({ error: 'Failed to delete notice' }, 500)
  }
}
