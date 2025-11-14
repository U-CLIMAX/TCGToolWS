import { createErrorResponse } from './utils.js'

/**
 * 處理來自愛發電的 Webhook
 * (這是被 auth.js 調用的)
 */
export const processAfdianOrder = async (c, db, payload) => {
  const order = payload.data.order
  const customOrderId = order.custom_order_id
  const afdianTradeNo = order.out_trade_no

  // 1. 檢查 custom_order_id
  if (!customOrderId) {
    console.warn(`Afdian Webhook: Order ${afdianTradeNo} has no custom_order_id.`)
    // 我們無法追蹤，但必須返回 ok
    return c.json({ ec: 200, em: 'No custom_order_id' })
  }

  // 2. 查找我們的 "pending" 訂單
  const localOrder = await db
    .prepare('SELECT * FROM afdian_orders WHERE id = ?1')
    .bind(customOrderId)
    .first()

  if (!localOrder) {
    console.error(`Afdian Webhook: Order ${customOrderId} not found in DB.`)
    return c.json({ ec: 200, em: 'Order not found' })
  }

  // 3. 處理冪等性：如果訂單已完成
  if (localOrder.status === 'completed') {
    return c.json({ ec: 200, em: 'Already processed' })
  }

  // 4. 查找用戶
  const user = await db
    .prepare('SELECT id, premium_expire_time FROM users WHERE id = ?1')
    .bind(localOrder.user_id)
    .first()

  if (!user) {
    console.error(`Afdian Webhook: User ${localOrder.user_id} not found for order ${customOrderId}`)
    return c.json({ ec: 200, em: 'User not found' })
  }

  const months = parseInt(order.month, 10)
  if (isNaN(months) || months <= 0) {
    return c.json({ ec: 400, em: 'Invalid month count' })
  }

  // 6. 計算到期日 (根據 schema.sql)
  const now = Math.floor(Date.now() / 1000)
  const currentExpiry = user.premium_expire_time || 0
  const baseTime = currentExpiry > now ? currentExpiry : now // 確保了訂閱可以疊加

  // 計算總共要添加的秒數
  const daysToAdd = months * 31 // 每個 'month' 算作 31 天
  const secondsPerDay = 86400 // 24 * 60 * 60
  const newExpiryTimestamp = baseTime + daysToAdd * secondsPerDay

  // 5. 更新用戶和訂單狀態 (理想情況下應使用事務)
  try {
    const statements = [
      db
        .prepare('UPDATE users SET role = ?1, premium_expire_time = ?2 WHERE id = ?3')
        .bind(1, newExpiryTimestamp, user.id),

      db
        .prepare(
          'UPDATE afdian_orders SET status = ?1, processed_at = ?2, afdian_trade_no = ?3 WHERE id = ?4'
        )
        .bind('completed', now, afdianTradeNo, customOrderId),
    ]

    await db.batch(statements)

    return c.json({ ec: 200, em: 'ok' })
  } catch (error) {
    console.error('Afdian Webhook: DB update failed', error)
    // 檢查錯誤是否為 afdian_trade_no UNIQUE 衝突 (表示另一個進程已處理)
    if (
      error.message &&
      error.message.includes('UNIQUE constraint failed: afdian_orders.afdian_trade_no')
    ) {
      return c.json({ ec: 200, em: 'Already processed (race condition)' })
    }
    return c.json({ ec: 500, em: 'Database update error' })
  }
}

/**
 * 處理用戶發起的支付請求
 * (這是一個新的 API 端點)
 */
export const handleInitiatePayment = async (c) => {
  const db = c.env.DB
  const user = c.get('user') // 來自 authMiddleware
  const planId = '6c0d2ad4bb5711f0b39a52540025c377' // ⚠️ 替換成您的 Plan ID

  try {
    const customOrderId = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)

    // 1. 寫入 "pending" 訂單到新表
    await db
      .prepare('INSERT INTO afdian_orders (id, user_id, created_at) VALUES (?1, ?2, ?3)')
      .bind(customOrderId, user.id, now)
      .run()

    // 2. 構建愛發電 URL
    const afdianUrl = `https://afdian.com/order/create?plan_id=${planId}&custom_order_id=${customOrderId}&month=1`

    // 3. 返回 URL 給前端
    return c.json({
      success: true,
      url: afdianUrl,
    })
  } catch (error) {
    console.error('Failed to initiate payment', error)
    return createErrorResponse(500, '創建訂單失敗。')
  }
}
