/**
 * Weekly scheduled task to clean up expired temporary data (older than 24 hours) from the database.
 * This includes: unverified registrations (pending_registrations), password reset requests (password_resets),
 * and expired orders (afdian_orders).
 *
 * @param {Env} env - Environment variables and bindings. Must contain the D1 Database binding (env.DB).
 */
export const cleanupDatabase = async (env) => {
  const db = env.DB
  const now = Math.floor(Date.now() / 1000)
  console.log(`开始清理过期的资料库记录，当前时间戳: ${now}...`)

  try {
    const cleanupThreshold = now - 86400 // 24 小时前的时间戳

    const stmt1 = db.prepare('DELETE FROM pending_registrations WHERE expires_at < ?1').bind(now)

    const stmt2 = db.prepare('DELETE FROM password_resets WHERE expires_at < ?1').bind(now)

    const stmt3 = db
      .prepare(
        // 清理所有创建时间 早于 24 小时前的订单
        'DELETE FROM afdian_orders WHERE created_at < ?1'
      )
      .bind(cleanupThreshold) // 绑定 24 小时前的时间戳

    const results = await db.batch([stmt1, stmt2, stmt3])

    console.log('资料库清理成功！')
    results.forEach((result, index) => {
      console.log(`语句 ${index + 1} 执行结果:`, result)
    })
  } catch (error) {
    console.error('资料库清理失败:', error)
  }
}
