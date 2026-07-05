import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import localforage from 'localforage'
import { wrap } from 'comlink'
import PriceWorker from '@/workers/price.worker.js?worker'
import { useAuthStore } from './auth'
import { compressToEncodedURIComponent } from 'lz-string'

const priceCache = localforage.createInstance({
  name: 'card-prices',
})

export const usePriceStore = defineStore('price', () => {
  const prices = shallowRef({}) // { seriesId: { [cardId]: price } }
  const priceMetadata = shallowRef({}) // { seriesId: { lastUpdate, nextUpdate } }
  const isLoading = ref(false)
  const authStore = useAuthStore()

  const fetchPrices = async (configs) => {
    const configArray = Array.isArray(configs) ? configs : [configs]
    const validConfigs = configArray.filter((c) => c.seriesId && c.yytUrl)

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
          const refreshInterval = isPremium ? 3 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000

          if (seriesMeta && now < seriesMeta.ttl) {
            prices.value = {
              ...prices.value,
              [seriesId]: seriesMeta.data,
            }
            priceMetadata.value = {
              ...priceMetadata.value,
              [seriesId]: {
                lastUpdate: seriesMeta.ttl - refreshInterval,
                nextUpdate: seriesMeta.ttl,
              },
            }
            return
          }

          // Fetch from backend
          const headers = {
            UA: navigator.userAgent,
          }
          if (authStore.token) {
            headers['Authorization'] = `Bearer ${authStore.token}`
          }

          const res = await fetch(
            `/api/prices/${seriesId}?ref=${compressToEncodedURIComponent(yytUrl)}`,
            {
              headers,
            }
          )
          if (!res.ok) {
            throw new Error(`Failed to fetch prices for series ${seriesId}: ${res.statusText}`)
          }

          const compressedBuffer = await res.arrayBuffer()
          const { ungzip } = await import('pako')
          const decompressed = ungzip(new Uint8Array(compressedBuffer), { toText: true })
          const htmls = JSON.parse(decompressed)

          const workerInstance = new PriceWorker()
          const priceWorker = wrap(workerInstance)
          const parsedPrices = await priceWorker.parsePrices(htmls)
          workerInstance.terminate()

          const ttl = Date.now() + refreshInterval

          prices.value = {
            ...prices.value,
            [seriesId]: parsedPrices,
          }
          priceMetadata.value = {
            ...priceMetadata.value,
            [seriesId]: {
              lastUpdate: Date.now(),
              nextUpdate: ttl,
            },
          }
          await priceCache.setItem(cacheKey, {
            data: parsedPrices,
            ttl,
          })
        })
      )
    } catch (error) {
      console.error('[PriceStore] Error fetching prices:', error)
      throw error
    } finally {
      isLoading.value = false
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

    const newPrices = { ...prices.value }
    delete newPrices[seriesId]
    prices.value = newPrices

    const newMeta = { ...priceMetadata.value }
    delete newMeta[seriesId]
    priceMetadata.value = newMeta
  }

  const reset = () => {
    prices.value = {}
    priceMetadata.value = {}
  }

  return {
    prices,
    priceMetadata,
    isLoading,
    fetchPrices,
    getPrice,
    getPriceUpdateTime,
    getCachedSeriesIds,
    clearCache,
    reset,
  }
})
