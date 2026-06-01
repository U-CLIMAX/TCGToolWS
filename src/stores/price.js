import { defineStore } from 'pinia'
import { ref } from 'vue'
import localforage from 'localforage'
import { wrap } from 'comlink'
import PriceWorker from '@/workers/price.worker.js?worker'
import pako from 'pako'

const priceCache = localforage.createInstance({
  name: 'card-prices',
})

export const usePriceStore = defineStore('price', () => {
  const prices = ref({}) // { seriesId: { [cardId]: price } }
  const isLoading = ref(false)

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
          // Check localforage cache first
          const seriesMeta = await priceCache.getItem(`meta_${seriesId}`)
          const now = Date.now()

          if (seriesMeta && now < seriesMeta.ttl) {
            prices.value[seriesId] = seriesMeta.data
            return
          }

          // Fetch from backend
          const res = await fetch(`/api/prices/${seriesId}?url=${encodeURIComponent(yytUrl)}`)
          if (!res.ok) return // Silently fail for individual series

          const compressedBuffer = await res.arrayBuffer()
          const decompressed = pako.ungzip(new Uint8Array(compressedBuffer), { to: 'string' })
          const htmls = JSON.parse(decompressed)

          const workerInstance = new PriceWorker()
          const priceWorker = wrap(workerInstance)
          const parsedPrices = await priceWorker.parsePrices(htmls)
          workerInstance.terminate()

          const ttl = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

          prices.value[seriesId] = parsedPrices
          await priceCache.setItem(`meta_${seriesId}`, {
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
    const seriesMeta = await priceCache.getItem(`meta_${seriesId}`)
    if (!seriesMeta || !seriesMeta.ttl) return null

    const ttl = seriesMeta.ttl
    const lastUpdateTime = ttl - 7 * 24 * 60 * 60 * 1000 // Subtract 7 days to get when it was last updated

    return {
      lastUpdate: lastUpdateTime,
      nextUpdate: ttl,
    }
  }

  const getCachedSeriesIds = async () => {
    if (!priceCache) return []
    const keys = await priceCache.keys()
    return keys.filter((k) => k.startsWith('meta_')).map((k) => k.replace('meta_', ''))
  }

  const clearCache = async (seriesId) => {
    if (!priceCache || !seriesId) return
    await priceCache.removeItem(`meta_${seriesId}`)
    delete prices.value[seriesId]
  }

  return {
    prices,
    isLoading,
    fetchPrices,
    getPrice,
    getPriceUpdateTime,
    getCachedSeriesIds,
    clearCache,
  }
})
