import { wrap } from 'comlink'
import { onUnmounted } from 'vue'
import DeckWorker from '@/workers/deck.worker.js?worker'

export const useDeckEncoder = () => {
  const workerInstance = new DeckWorker()
  const deckWorker = wrap(workerInstance)

  onUnmounted(() => {
    workerInstance.terminate()
  })

  const encodeData = async (data) => {
    return await deckWorker.compress(data)
  }

  const decodeData = async (data) => {
    try {
      return await deckWorker.decompress(data)
    } catch {
      return data
    }
  }

  return {
    encodeData,
    decodeData,
  }
}
