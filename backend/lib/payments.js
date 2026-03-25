import { createErrorResponse } from './utils.js'

/**
 * Processes a successful order notification from Afdian.
 * This is called internally by handleAfdianWebhook in auth.js.
 * @param {object} c - Hono context object.
 * @param {object} db - D1 database instance.
 * @param {object} payload - Afdian webhook payload.
 * @returns {Response}
 */
export const processAfdianOrder = async (c, db, payload) => {
  const order = payload.data.order
  const customOrderId = order.custom_order_id
  const afdianTradeNo = order.out_trade_no

  // 1. Validate custom_order_id
  if (!customOrderId) {
    console.warn(`Afdian Webhook: Order ${afdianTradeNo} has no custom_order_id.`)
    return c.json({ ec: 200, em: 'No custom_order_id' })
  }

  // 2. Locate the "pending" order in local DB
  const localOrder = await db
    .prepare('SELECT * FROM afdian_orders WHERE id = ?1')
    .bind(customOrderId)
    .first()

  if (!localOrder) {
    console.error(`Afdian Webhook: Order ${customOrderId} not found in DB.`)
    return c.json({ ec: 200, em: 'Order not found' })
  }

  // 3. Handle idempotency: if order is already completed
  if (localOrder.status === 'completed') {
    return c.json({ ec: 200, em: 'Already processed' })
  }

  // 4. Locate the associated user
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

  // 5. Calculate new expiry date (subscription stacking support)
  const now = Math.floor(Date.now() / 1000)
  const currentExpiry = user.premium_expire_time || 0
  const baseTime = currentExpiry > now ? currentExpiry : now

  // Each 'month' is counted as 31 days
  const daysToAdd = months * 31
  const secondsPerDay = 86400
  const newExpiryTimestamp = baseTime + daysToAdd * secondsPerDay

  // 6. Update user role and order status atomically via batch
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
    // Check for unique constraint violation on afdian_trade_no (race condition handled)
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
 * Initiates a payment request by generating an Afdian payment URL.
 * @param {object} c - Hono context object.
 * @returns {Response}
 */
export const handleInitiatePayment = async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const planId = '6c0d2ad4bb5711f0b39a52540025c377'

  try {
    const customOrderId = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)

    // Log the "pending" order
    await db
      .prepare('INSERT INTO afdian_orders (id, user_id, created_at) VALUES (?1, ?2, ?3)')
      .bind(customOrderId, user.id, now)
      .run()

    // Construct Afdian checkout URL
    const afdianUrl = `https://ifdian.net/order/create?plan_id=${planId}&custom_order_id=${customOrderId}`

    return c.json({
      success: true,
      url: afdianUrl,
    })
  } catch (error) {
    console.error('Failed to initiate payment:', error)
    return createErrorResponse(c, 500, '创建订单失败')
  }
}
