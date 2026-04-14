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

          const ttl = Date.now() + 129600000 // 36 hours

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

  const clearCache = async () => {
    if (!priceCache) return
    await priceCache.clear()
    prices.value = {}
  }

  return {
    prices,
    isLoading,
    fetchPrices,
    getPrice,
    clearCache,
  }
})
