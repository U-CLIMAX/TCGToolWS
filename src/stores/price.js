import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import localforage from 'localforage'
import { transfer } from 'comlink'
import PriceWorker from '@/workers/price.worker.js?worker'
import { createManagedWorker } from '@/utils/workerManager'
import { useAuthStore } from './auth'
import { compressToEncodedURIComponent } from 'lz-string'

const priceCache = localforage.createInstance({
  name: 'card-prices',
})

const priceWorkerManager = createManagedWorker(PriceWorker)

export const usePriceStore = defineStore('price', () => {
  const prices = shallowRef({}) // { seriesId: { [cardId]: price } }
  const priceMetadata = shallowRef({}) // { seriesId: { lastUpdate, nextUpdate } }
  const isLoading = ref(false)
  const authStore = useAuthStore()

  const pendingRequests = new Map()
  let activeFetchCount = 0

  /**
   * Fetches and parses prices for a single series.
   * Handles memory cache short-circuit, in-flight deduplication, localforage cache, and backend fetch.
   * @param {{ seriesId: string, yytUrl: string }} config
   * @returns {Promise<{ seriesId: string, data: object, metadata: { lastUpdate: number, nextUpdate: number, yytUrl?: string } }>}
   */
  const fetchSingleSeries = async ({ seriesId, yytUrl }) => {
    const isPremium = authStore.userRole !== 0
    const cachePrefix = isPremium ? 'meta_premium_' : 'meta_'
    const cacheKey = `${cachePrefix}${seriesId}`
    const now = Date.now()
    const refreshInterval = isPremium ? 3 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000

    // 1. In-memory cache short-circuit
    const currentPrices = prices.value[seriesId]
    const currentMeta = priceMetadata.value[seriesId]
    if (
      currentPrices &&
      currentMeta &&
      (!currentMeta.yytUrl || currentMeta.yytUrl === yytUrl) &&
      now < currentMeta.nextUpdate
    ) {
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
      const checkNow = Date.now()
      if (seriesMeta && seriesMeta.yytUrl === yytUrl && checkNow < seriesMeta.ttl) {
        return {
          seriesId,
          data: seriesMeta.data,
          metadata: {
            lastUpdate: seriesMeta.ttl - refreshInterval,
            nextUpdate: seriesMeta.ttl,
            yytUrl,
          },
        }
      }

      // 4. Fetch from backend
      const headers = {
        UA: navigator.userAgent,
      }
      if (authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`
      }

      const res = await fetch(
        `/api/prices/${seriesId}?ref=${compressToEncodedURIComponent(yytUrl)}`,
        { headers }
      )
      if (!res.ok) {
        throw new Error(`Failed to fetch prices for series ${seriesId}: ${res.statusText}`)
      }

      const compressedBuffer = await res.arrayBuffer()
      const parsedPrices = await priceWorkerManager.run((worker) =>
        worker.parsePricesFromBuffer(transfer(compressedBuffer, [compressedBuffer]))
      )

      const ttl = Date.now() + refreshInterval
      const metadata = {
        lastUpdate: Date.now(),
        nextUpdate: ttl,
        yytUrl,
      }

      await priceCache.setItem(cacheKey, {
        data: parsedPrices,
        ttl,
        yytUrl,
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
   * Fetches prices for given series configs.
   * Deduplicates seriesId, utilizes worker parsing, and updates prices/metadata using Promise.allSettled.
   * @param {{ seriesId: string, yytUrl: string } | { seriesId: string, yytUrl: string }[]} configs
   */
  const fetchPrices = async (configs) => {
    const configArray = Array.isArray(configs) ? configs : [configs]
    // SeriesId deduplication
    const validConfigs = []
    const seenSeries = new Set()
    for (const c of configArray) {
      if (c?.seriesId && c?.yytUrl && !seenSeries.has(c.seriesId)) {
        seenSeries.add(c.seriesId)
        validConfigs.push(c)
      }
    }

    if (validConfigs.length === 0) return

    activeFetchCount++
    isLoading.value = true

    try {
      const results = await Promise.allSettled(
        validConfigs.map((config) => fetchSingleSeries(config))
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
    // Return from memory if available
    return prices.value[seriesId]?.[cardId]
  }

  const getPriceUpdateTime = (seriesId) => {
    if (!seriesId) return null
    return priceMetadata.value[seriesId] || null
  }

  const reset = () => {
    prices.value = {}
    priceMetadata.value = {}
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
