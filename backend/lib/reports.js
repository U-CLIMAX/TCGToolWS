import { createErrorResponse } from './utils.js'

/**
 * Submits a card translation error report.
 * @param {AppContext} c - Hono context object.
 * @returns {Promise<Response>}
 */
export async function handleCreateTranslationReport(c) {
  const db = c.env.DB
  try {
    const { cardId, reason } = await c.req.json()

    if (!cardId || !reason) {
      return createErrorResponse(c, 400, '卡片ID和回报原因为必填项')
    }

    await db
      .prepare('INSERT INTO translation_reports (card_id, reason) VALUES (?1, ?2)')
      .bind(cardId, reason)
      .run()

    return c.json({ success: true })
  } catch (err) {
    console.error('Failed to create translation report:', err)
    return createErrorResponse(c, 500, '提交回报失败')
  }
}
