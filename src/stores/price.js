import { defineStore } from 'pinia'
import { ref } from 'vue'
import localforage from 'localforage'
import { wrap } from 'comlink'
import PriceWorker from '@/workers/price.worker.js?worker'
import pako from 'pako'
import { useAuthStore } from './auth'
import { compressToEncodedURIComponent } from 'lz-string'

const priceCache = localforage.createInstance({
  name: 'card-prices',
})

export const usePriceStore = defineStore('price', () => {
  const prices = ref({}) // { seriesId: { [cardId]: price } }
  const isLoading = ref(false)
  const authStore = useAuthStore()

  const fetchPrices = async (configs) => {
    const configArray = Array.isArray(configs) ? configs : [configs]
    const validConfigs = configArray.filter(
      (c) => c.seriesId && c.yytUrl && !prices.value[c.seriesId]
    )

    if (validConfigs.length === 0) return

    isLoading.value = true
    try {
      await Promise.all(
        validConfigs.map(async ({ seriesId, yytUrl }) => {
          const isPremium = authStore.userRole !== 0
          const cachePrefix = isPremium ? 'meta_premium_' : 'meta_'
          const cacheKey = `${cachePrefix}${seriesId}`

          // Check localforage cache first
          const seriesMeta = await priceCache.getItem(cacheKey)
          const now = Date.now()

          if (seriesMeta && now < seriesMeta.ttl) {
            prices.value[seriesId] = seriesMeta.data
            return
          }

          // Fetch from backend
          const headers = {}
          if (authStore.token) {
            headers['Authorization'] = `Bearer ${authStore.token}`
          }

          const res = await fetch(
            `/api/prices/${seriesId}?ref=${compressToEncodedURIComponent(yytUrl)}`,
            {
              headers,
            }
          )
          if (!res.ok) return // Silently fail for individual series

          const compressedBuffer = await res.arrayBuffer()
          const decompressed = pako.ungzip(new Uint8Array(compressedBuffer), { to: 'string' })
          const htmls = JSON.parse(decompressed)

          const workerInstance = new PriceWorker()
          const priceWorker = wrap(workerInstance)
          const parsedPrices = await priceWorker.parsePrices(htmls)
          workerInstance.terminate()

          const refreshInterval = isPremium ? 1 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
          const ttl = Date.now() + refreshInterval

          prices.value[seriesId] = parsedPrices
          await priceCache.setItem(cacheKey, {
            data: parsedPrices,
            ttl,
          })
        })
      )
    } catch (error) {
      console.error('[PriceStore] Error fetching prices:', error)
    } finally {
      isLoading.value = false
    }
  }

  const getPrice = (seriesId, cardId) => {
    // Return from memory if available
    return prices.value[seriesId]?.[cardId]
  }

  const getPriceUpdateTime = async (seriesId) => {
    if (!priceCache || !seriesId) return null
    const isPremium = authStore.userRole !== 0
    const cachePrefix = isPremium ? 'meta_premium_' : 'meta_'
    const cacheKey = `${cachePrefix}${seriesId}`

    const seriesMeta = await priceCache.getItem(cacheKey)
    if (!seriesMeta || !seriesMeta.ttl) return null

    const ttl = seriesMeta.ttl
    const refreshInterval = isPremium ? 1 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    const lastUpdateTime = ttl - refreshInterval

    return {
      lastUpdate: lastUpdateTime,
      nextUpdate: ttl,
    }
  }

  const getCachedSeriesIds = async () => {
    if (!priceCache) return []
    const keys = await priceCache.keys()
    return keys
      .filter((k) => k.startsWith('meta_') || k.startsWith('meta_premium_'))
      .map((k) => k.replace(/^meta_premium_|^meta_/, ''))
  }

  const clearCache = async (seriesId) => {
    if (!priceCache || !seriesId) return
    await priceCache.removeItem(`meta_${seriesId}`)
    await priceCache.removeItem(`meta_premium_${seriesId}`)
    delete prices.value[seriesId]
  }

  const reset = () => {
    prices.value = {}
  }

  return {
    prices,
    isLoading,
    fetchPrices,
    getPrice,
    getPriceUpdateTime,
    getCachedSeriesIds,
    clearCache,
    reset,
  }
})
