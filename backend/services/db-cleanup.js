/**
 * Weekly scheduled task to clean up expired temporary data and old notices from the database.
 * This includes: unverified registrations (pending_registrations), password reset requests (password_resets),
 * expired orders (afdian_orders, older than 24 hours), and old announcements (notices, older than 2 months).
 *
 * @param {Env} env - Environment variables and bindings. Must contain the D1 Database binding (env.DB).
 */
export const cleanupDatabase = async (env) => {
  const db = env.DB
  const nowMs = Date.now()
  const now = Math.floor(nowMs / 1000)
  console.log(`开始清理过期的资料库记录，当前时间戳: ${now}...`)

  try {
    const cleanupThreshold = now - 86400 // 24 小时前的时间戳 (秒)
    const noticeCleanupThreshold = nowMs - 60 * 86400 * 1000 // 2 个月 (60 天) 前的时间戳 (毫秒)

    const stmt1 = db.prepare('DELETE FROM pending_registrations WHERE expires_at < ?1').bind(now)

    const stmt2 = db.prepare('DELETE FROM password_resets WHERE expires_at < ?1').bind(now)

    const stmt3 = db
      .prepare(
        // 清理所有创建时间 早于 24 小时前的订单
        'DELETE FROM afdian_orders WHERE created_at < ?1'
      )
      .bind(cleanupThreshold)

    const stmt4 = db
      .prepare(
        // 清理所有更新时间早于 2 个月 (60 天) 前的公告 (notices.updated_at 为毫秒时间戳)
        'DELETE FROM notices WHERE updated_at < ?1'
      )
      .bind(noticeCleanupThreshold)

    const results = await db.batch([stmt1, stmt2, stmt3, stmt4])

    console.log('资料库清理成功！')
    results.forEach((result, index) => {
      console.log(`语句 ${index + 1} 执行结果:`, result)
    })
  } catch (error) {
    console.error('资料库清理失败:', error)
  }
}
