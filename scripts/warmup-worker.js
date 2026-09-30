const domain = process.env.WARMUP_URL || process.argv[2] || 'https://www.uclimax.top'

async function warmup() {
  console.log(`[Warmup] Pinging ${domain}/api/warmup to pre-warm Durable Objects...`)
  try {
    const res = await fetch(`${domain}/api/warmup`)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text || 'Empty response'}`)
    }
    const data = await res.json()
    console.log('[Warmup] Result:', data)
  } catch (err) {
    console.warn('[Warmup] Note: Ping completed with warning:', err.message)
  }
}

warmup()
