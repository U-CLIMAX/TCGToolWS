import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import localforage from 'localforage'
import { transfer } from 'comlink'
import PriceWorker from '@/workers/price.worker.js?worker'
import { createManagedWorker } from '@/utils/workerManager'
import { useAuthStore } from './auth'
import { apiFetch } from '@/utils/api.js'

const priceCache = localforage.createInstance({
  name: 'card-prices',
})

const priceWorkerManager = createManagedWorker(PriceWorker)

export const usePriceStore = defineStore('price', () => {
  const prices = shallowRef({}) // { seriesId: { [cardId]: price } }
  const priceMetadata = shallowRef({}) // { seriesId: { lastUpdate, nextUpdate, urlHash } }
  const isLoading = ref(false)
  const authStore = useAuthStore()

  const pendingRequests = new Map()
  let activeFetchCount = 0

  let seriesHashesCache = null
  let hashesPromise = null

  /**
   * Fetches all series URL hashes from backend with in-flight deduplication and caching.
   * @returns {Promise<Record<string, string> | null>}
   */
  const fetchAllSeriesHashes = async () => {
    if (!authStore.isOnline) return null
    if (seriesHashesCache) return seriesHashesCache
    if (hashesPromise) return hashesPromise

    hashesPromise = (async () => {
      try {
        const res = await apiFetch('/api/prices/hashes')
        if (res.ok) {
          seriesHashesCache = await res.json()
          return seriesHashesCache
        }
      } catch (e) {
        console.warn('[PriceStore] Failed to fetch series hashes:', e)
      }
      return null
    })().finally(() => {
      hashesPromise = null
    })

    return hashesPromise
  }

  /**
   * Gets the backend URL hash for a specific seriesId.
   * @param {string} seriesId
   * @returns {Promise<string | null>}
   */
  const getBackendSeriesHash = async (seriesId) => {
    const hashes = await fetchAllSeriesHashes()
    return hashes ? hashes[seriesId] || '' : null
  }

  /**
   * Fetches and parses prices for a single series.
   * Handles memory cache short-circuit, in-flight deduplication, localforage cache, and backend fetch.
   * @param {string} seriesId
   * @returns {Promise<{ seriesId: string, data: object, metadata: { lastUpdate: number, nextUpdate: number, urlHash?: string } }>}
   */
  const fetchSingleSeries = async (seriesId) => {
    if (!authStore.isOnline) {
      return {
        seriesId,
        data: {},
        metadata: { lastUpdate: 0, nextUpdate: 0, urlHash: '' },
      }
    }

    const isPremium = authStore.userRole !== 0
    const cachePrefix = isPremium ? 'meta_premium_' : 'meta_'
    const cacheKey = `${cachePrefix}${seriesId}`
    const now = Date.now()
    const refreshInterval = isPremium ? 3 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000

    // 1. In-memory cache short-circuit
    const currentPrices = prices.value[seriesId]
    const currentMeta = priceMetadata.value[seriesId]
    if (currentPrices && currentMeta && now < currentMeta.nextUpdate) {
      return {
        seriesId,
        data: currentPrices,
        metadata: currentMeta,
      }
    }

    // 2. In-flight deduplication
    if (pendingRequests.has(seriesId)) {
      return pendingRequests.get(seriesId)
    }

    const fetchPromise = (async () => {
      // 3. Localforage cache check
      const seriesMeta = await priceCache.getItem(cacheKey)
      const currentHash = await getBackendSeriesHash(seriesId)
      const checkNow = Date.now()
      if (seriesMeta && checkNow < seriesMeta.ttl) {
        // Compare with backend urlHash to detect if the series URL changed
        if (!currentHash || seriesMeta.urlHash === currentHash) {
          return {
            seriesId,
            data: seriesMeta.data,
            metadata: {
              lastUpdate: seriesMeta.ttl - refreshInterval,
              nextUpdate: seriesMeta.ttl,
              urlHash: seriesMeta.urlHash,
            },
          }
        }
      }

      // 4. Fetch from backend
      const headers = {
        UA: navigator.userAgent,
      }
      if (isPremium && authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`
      }

      const query = currentHash ? `?v=${currentHash}` : ''
      const res = await apiFetch(`/api/prices/${seriesId}${query}`, { headers })
      if (!res.ok) {
        throw new Error(`Failed to fetch prices for series ${seriesId}: ${res.statusText}`)
      }

      const urlHash = res.headers.get('X-URL-Hash') || ''
      const compressedBuffer = await res.arrayBuffer()
      const parsedPrices = await priceWorkerManager.run((worker) =>
        worker.parsePricesFromBuffer(transfer(compressedBuffer, [compressedBuffer]))
      )

      const ttl = Date.now() + refreshInterval
      const metadata = {
        lastUpdate: Date.now(),
        nextUpdate: ttl,
        urlHash,
      }

      await priceCache.setItem(cacheKey, {
        data: parsedPrices,
        ttl,
        urlHash,
      })

      return {
        seriesId,
        data: parsedPrices,
        metadata,
      }
    })().finally(() => {
      pendingRequests.delete(seriesId)
    })

    pendingRequests.set(seriesId, fetchPromise)
    return fetchPromise
  }

  /**
   * Fetches prices for given series IDs.
   * Deduplicates seriesId, utilizes worker parsing, and updates prices/metadata using Promise.allSettled.
   * @param {string | string[]} seriesIds
   */
  const fetchPrices = async (seriesIds) => {
    if (!authStore.isOnline || !seriesIds) return
    const idArray = Array.isArray(seriesIds) ? seriesIds : [seriesIds]
    // SeriesId deduplication
    const validIds = []
    const seenSeries = new Set()
    for (const id of idArray) {
      if (typeof id === 'string' && id && !seenSeries.has(id)) {
        seenSeries.add(id)
        validIds.push(id)
      }
    }

    if (validIds.length === 0) return

    activeFetchCount++
    isLoading.value = true

    try {
      const results = await Promise.allSettled(
        validIds.map((seriesId) => fetchSingleSeries(seriesId))
      )

      const newPrices = {}
      const newMetadata = {}
      let hasFulfilled = false
      let hasErrors = false
      let hasRealChanges = false

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const { seriesId, data, metadata } = result.value
          if (data && metadata) {
            hasFulfilled = true
            if (prices.value[seriesId] !== data || priceMetadata.value[seriesId] !== metadata) {
              hasRealChanges = true
            }
            newPrices[seriesId] = data
            newMetadata[seriesId] = metadata
          }
        } else if (result.status === 'rejected') {
          hasErrors = true
          console.error('[PriceStore] Error fetching prices for series:', result.reason)
        }
      }

      if (hasRealChanges) {
        prices.value = {
          ...prices.value,
          ...newPrices,
        }
        priceMetadata.value = {
          ...priceMetadata.value,
          ...newMetadata,
        }
      }

      if (hasErrors && !hasFulfilled) {
        throw new Error('Failed to fetch prices for requested series')
      }
    } finally {
      activeFetchCount = Math.max(0, activeFetchCount - 1)
      isLoading.value = activeFetchCount > 0
    }
  }

  const getPrice = (seriesId, cardId) => {
    if (!authStore.isOnline) return null
    // Return from memory if available
    return prices.value[seriesId]?.[cardId] || null
  }

  const getPriceUpdateTime = (seriesId) => {
    if (!authStore.isOnline || !seriesId) return null
    return priceMetadata.value[seriesId] || null
  }

  const reset = () => {
    prices.value = {}
    priceMetadata.value = {}
    seriesHashesCache = null
    pendingRequests.clear()
    priceWorkerManager.terminate()
  }

  return {
    prices,
    priceMetadata,
    isLoading,
    fetchPrices,
    getPrice,
    getPriceUpdateTime,
    reset,
  }
})
