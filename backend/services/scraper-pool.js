import { DurableObject } from 'cloudflare:workers'
import { parseTokens } from './scraper.js'

/**
 * @typedef {Object} AccountState
 * @property {number} max - Maximum concurrency limit
 * @property {number} active - Current active in-flight requests
 * @property {boolean} ok - Health and quota status
 */

/**
 * High-performance, SQLite-backed Durable Object coordinating multi-account ScraperAPI pools.
 */
export class ScraperPool extends DurableObject {
  /** @type {Map<string, AccountState>} */
  #pool = new Map()

  /** @type {Array<(key: string) => void>} */
  #queue = []

  /**
   * @param {DurableObjectState} ctx - Durable Object State.
   * @param {Env} env - Environment bindings.
   */
  constructor(ctx, env) {
    super(ctx, env)
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        key TEXT PRIMARY KEY,
        max INTEGER NOT NULL,
        ok INTEGER NOT NULL
      )
    `)
    const keys = parseTokens(env?.SCRAPER_API_KEY)
    if (keys.length > 0) {
      const rows = [...ctx.storage.sql.exec('SELECT key, max, ok FROM accounts')]
      if (rows.length === keys.length && keys.every((k) => rows.some((r) => r.key === k))) {
        this.#pool = new Map(
          rows.map((r) => [r.key, { max: Number(r.max), active: 0, ok: Boolean(r.ok) }])
        )
      } else {
        ctx.blockConcurrencyWhile(() => this.sync(keys))
      }
    }
  }

  /**
   * Synchronizes quota and concurrency limits with ScraperAPI accounts via /account endpoint.
   * @param {string[]} keys - List of ScraperAPI keys.
   * @returns {Promise<void>}
   */
  async sync(keys) {
    const keySet = new Set(keys)
    for (const k of this.#pool.keys()) {
      if (!keySet.has(k)) {
        this.#pool.delete(k)
        this.ctx.storage.sql.exec('DELETE FROM accounts WHERE key = ?', k)
      }
    }

    await Promise.all(
      keys.map(async (k) => {
        try {
          const res = await fetch(`https://api.scraperapi.com/account?api_key=${k}`)
          if (!res.ok) {
            const cur = this.#pool.get(k) || { max: 5, active: 0, ok: false }
            this.#pool.set(k, { ...cur, ok: false })
            return
          }
          /** @type {{ concurrencyLimit?: number, creditsLeft?: number, requestLimit?: number, requestCount?: number }} */
          const d = await res.json()
          const credits =
            typeof d.creditsLeft === 'number'
              ? d.creditsLeft
              : (d.requestLimit || 0) - (d.requestCount || 0)
          const cur = this.#pool.get(k) || { max: 5, active: 0, ok: true }
          this.#pool.set(k, {
            ...cur,
            max: d.concurrencyLimit || 5,
            ok: credits > 0,
          })
        } catch (err) {
          console.warn('[ScraperPool] Failed to sync account:', err)
        }
      })
    )
    this.#drain()

    try {
      for (const [k, v] of this.#pool) {
        this.ctx.storage.sql.exec(
          'INSERT OR REPLACE INTO accounts (key, max, ok) VALUES (?, ?, ?)',
          k,
          v.max,
          v.ok ? 1 : 0
        )
      }
    } catch (err) {
      console.warn('[ScraperPool] Storage persist failed:', err)
    }
  }

  /**
   * Finds the healthiest key with the lowest active connections.
   * @returns {string|null}
   */
  #findAvailableKey() {
    let bestKey = null
    let minActive = Infinity
    for (const [k, a] of this.#pool) {
      if (a.ok && a.active < a.max && a.active < minActive) {
        minActive = a.active
        bestKey = k
      }
    }
    return bestKey
  }

  /**
   * Acquires an available API key from the pool, queueing if currently at capacity.
   * @param {number} [timeout=30000] - Queue timeout in milliseconds.
   * @returns {Promise<string>}
   */
  async acquire(timeout = 30000) {
    const key = this.#findAvailableKey()
    if (key) {
      const acc = this.#pool.get(key)
      if (acc) acc.active++
      return key
    }

    const hasHealthyAccount = [...this.#pool.values()].some((a) => a.ok)
    if (!hasHealthyAccount && this.#pool.size > 0) {
      throw new Error('ScraperPool: all accounts disabled or exhausted')
    }

    return new Promise((resolve, reject) => {
      /** @type {ReturnType<typeof setTimeout>} */
      const timer = setTimeout(() => {
        const idx = this.#queue.indexOf(run)
        if (idx !== -1) this.#queue.splice(idx, 1)
        reject(new Error('ScraperPool timeout: concurrency limit reached'))
      }, timeout)

      const run = (k) => {
        clearTimeout(timer)
        resolve(k)
      }
      this.#queue.push(run)
    })
  }

  /**
   * Releases an API key back to the pool and triggers subsequent queue processing.
   * @param {string} k - API key to release.
   * @param {number} [status] - HTTP status returned from the scrape request.
   * @returns {Promise<void>}
   */
  async release(k, status) {
    const a = this.#pool.get(k)
    if (a) {
      // If the scrape request returned 401 (invalid key) or 403 (credits exhausted), disable it immediately
      if (status === 401 || status === 403) {
        a.ok = false
        try {
          this.ctx.storage.sql.exec('UPDATE accounts SET ok = 0 WHERE key = ?', k)
        } catch {
          // Ignore write error on shutdown/disconnect
        }
      }
      if (a.active > 0) {
        a.active--
      }
    }
    this.#drain()
  }

  /**
   * Dispatches queued requests to newly freed capacity.
   */
  #drain() {
    while (this.#queue.length > 0) {
      const key = this.#findAvailableKey()
      if (!key) break
      const acc = this.#pool.get(key)
      if (acc) acc.active++
      const resolveNext = this.#queue.shift()
      if (resolveNext) resolveNext(key)
    }
  }
}

/**
 * Retrieves the global singleton Durable Object stub for ScraperPool.
 * @param {Env} env - Cloudflare worker environment.
 * @returns {DurableObjectStub<ScraperPool>|null}
 */
export const getScraperPool = (env) => {
  if (!env?.SCRAPER_POOL) return null
  const id = env.SCRAPER_POOL.idFromName('global_pool')
  return env.SCRAPER_POOL.get(id)
}
