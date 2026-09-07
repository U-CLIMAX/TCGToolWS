import DeckWorker from '@/workers/deck.worker.js?worker'
import { createManagedWorker } from '@/utils/workerManager'

const deckWorkerManager = createManagedWorker(DeckWorker)

export const useDeckEncoder = () => {
  const encodeData = async (data) => {
    return await deckWorkerManager.run((worker) => worker.compress(data))
  }

  const decodeData = async (data) => {
    try {
      return await deckWorkerManager.run((worker) => worker.decompress(data))
    } catch {
      return data
    }
  }

  return {
    encodeData,
    decodeData,
  }
}
