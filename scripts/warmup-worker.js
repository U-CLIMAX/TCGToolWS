const domain = process.env.WARMUP_URL || process.argv[2] || 'https://www.uclimax.top'

async function warmup(retries = 3, delayMs = 2000) {
  console.log(`[Warmup] Pinging ${domain}/api/warmup to pre-warm Durable Objects...`)
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${domain}/api/warmup`)
      if (res.ok) {
        const data = await res.json()
        console.log('[Warmup] Result:', data)
        return
      }
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs))
        continue
      }
      const text = await res.text()
      console.warn(`[Warmup] Note: Ping completed with warning: HTTP ${res.status}: ${text}`)
    } catch (err) {
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs))
        continue
      }
      console.warn('[Warmup] Note: Ping completed with warning:', err.message)
    }
  }
}

warmup()
