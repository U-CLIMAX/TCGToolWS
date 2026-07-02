import { wrap } from 'comlink'
import { onScopeDispose } from 'vue'
import DeckWorker from '@/workers/deck.worker.js?worker'

export const useDeckEncoder = () => {
  let workerInstance = null
  let deckWorker = null

  const getWorker = () => {
    if (!workerInstance) {
      workerInstance = new DeckWorker()
      deckWorker = wrap(workerInstance)
    }
    return deckWorker
  }

  onScopeDispose(() => {
    if (workerInstance) {
      workerInstance.terminate()
    }
  })

  const encodeData = async (data) => {
    const worker = getWorker()
    return await worker.compress(data)
  }

  const decodeData = async (data) => {
    try {
      const worker = getWorker()
      return await worker.decompress(data)
    } catch {
      return data
    }
  }

  return {
    encodeData,
    decodeData,
  }
}
