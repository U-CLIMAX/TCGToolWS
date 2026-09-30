import { DurableObject } from 'cloudflare:workers'

/**
 * @typedef {Object} AccountState
 * @property {number} max - Maximum concurrency limit
 * @property {number} active - Current active in-flight requests
 * @property {boolean} ok - Health and quota status
 */

/**
 * High-performance, zero-storage Durable Object coordinating multi-account ScraperAPI pools.
 */
export class ScraperPool extends DurableObject {
  /** @type {Map<string, AccountState>} */
  #pool = new Map()

  /** @type {Array<(key: string) => void>} */
  #queue = []

  /** @type {Promise<void>|null} */
  #initPromise = null

  /**
   * Synchronizes quota and concurrency limits with ScraperAPI accounts via /account endpoint.
   * @param {string[]} keys - List of ScraperAPI keys.
   * @returns {Promise<void>}
   */
  async sync(keys) {
    const keySet = new Set(keys)
    for (const k of this.#pool.keys()) {
      if (!keySet.has(k)) this.#pool.delete(k)
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
  }

  /**
   * Ensures the pool is initialized on cold start before acquiring keys.
   * @param {string[]} [keys=[]]
   * @returns {Promise<void>}
   */
  async #ensureInit(keys = []) {
    if (this.#pool.size === 0 && keys.length > 0) {
      if (!this.#initPromise) {
        this.#initPromise = this.sync(keys).finally(() => {
          this.#initPromise = null
        })
      }
      await this.#initPromise
    }
  }

  /**
   * Acquires an available API key from the pool, queueing if currently at capacity.
   * @param {string[]} [keys=[]] - Fallback/initial keys list for lazy cold-start initialization.
   * @param {number} [timeout=30000] - Queue timeout in milliseconds.
   * @returns {Promise<string>}
   */
  async acquire(keys = [], timeout = 30000) {
    // 首次冷啟動或池為空時，自動先執行一次 sync 初始化
    await this.#ensureInit(keys)

    for (const [k, a] of this.#pool) {
      if (a.ok && a.active < a.max) {
        a.active++
        return k
      }
    }

    return new Promise((resolve, reject) => {
      /** @type {ReturnType<typeof setTimeout>} */
      const timer = setTimeout(() => {
        this.#queue = this.#queue.filter((q) => q !== run)
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
      const entry = [...this.#pool.entries()].find(([, a]) => a.ok && a.active < a.max)
      if (!entry) break
      entry[1].active++
      const resolveNext = this.#queue.shift()
      if (resolveNext) resolveNext(entry[0])
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
