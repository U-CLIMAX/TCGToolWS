import BrotliWorker from '@/workers/brotli.worker.js?worker'
import { createManagedWorker } from '@/utils/workerManager.js'

const BROTLI_WORKER_IDLE_TIMEOUT_MS = 2000

const managedBrotliWorker = createManagedWorker(() => new BrotliWorker(), {
  idleTimeout: BROTLI_WORKER_IDLE_TIMEOUT_MS,
})

let nextRequestId = 0

/**
 * Fetches and decompresses Brotli file(s) in an ephemeral Web Worker
 * that automatically terminates when idle so brotli-wasm memory is released.
 * @param {string | string[]} files
 * @param {object} [options]
 * @param {(current: number, total: number) => void} [options.onProgress]
 * @param {number} [options.expectedBytes]
 * @param {string} [options.basePath]
 * @returns {Promise<Uint8Array>}
 */
export const decompressBrotliBytesInWorker = async (files, options = {}) => {
  const { onProgress, ...workerOptions } = options
  const requestId = onProgress ? `brotli-${++nextRequestId}` : undefined
  const unsubscribe = requestId
    ? managedBrotliWorker.onMessage((data) => {
        if (data?.type === 'brotli:progress' && data.requestId === requestId) {
          onProgress(data.current, data.total)
        }
      })
    : null

  try {
    return await managedBrotliWorker.run((api) =>
      api.decompressToBytes(files, {
        ...workerOptions,
        requestId,
      })
    )
  } finally {
    unsubscribe?.()
  }
}

/**
 * Fetches and decompresses Brotli file(s) to decoded UTF-8 text in the ephemeral worker.
 * @param {string | string[]} files
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export const decompressBrotliTextInWorker = async (files, options = {}) => {
  const bytes = await decompressBrotliBytesInWorker(files, options)
  return new TextDecoder().decode(bytes)
}

/**
 * Fetches and decompresses a keyed map of Brotli assets concurrently in the ephemeral worker.
 * @param {Record<string, string | string[]>} fileMap
 * @returns {Promise<Record<string, Uint8Array>>}
 */
export const decompressBrotliMapInWorker = async (fileMap) => {
  const entries = fileMap ? Object.entries(fileMap) : []
  if (entries.length === 0) return {}

  const decodedEntries = await Promise.all(
    entries.map(async ([key, fileOrChunks]) => [
      key,
      await decompressBrotliBytesInWorker(fileOrChunks),
    ])
  )
  return Object.fromEntries(decodedEntries)
}
