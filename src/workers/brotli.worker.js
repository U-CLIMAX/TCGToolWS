import { expose, transfer } from 'comlink'
import { fetchAndDecompressBrotliBytes } from '@/utils/brotliStream.js'

const BrotliService = {
  /**
   * Fetches and decompresses Brotli file(s) into a single Uint8Array and transfers buffer ownership back.
   * @param {string | string[]} files
   * @param {object} [options]
   * @param {string} [options.requestId]
   * @param {number} [options.expectedBytes]
   * @param {string} [options.basePath]
   * @returns {Promise<Uint8Array>}
   */
  decompressToBytes: async (files, options = {}) => {
    const { requestId, ...streamOptions } = options
    const rawBytes = await fetchAndDecompressBrotliBytes(files, {
      ...streamOptions,
      onProgress: requestId
        ? (current, total) =>
            self.postMessage({ type: 'brotli:progress', requestId, current, total })
        : undefined,
    })
    const exactBytes =
      rawBytes.byteOffset === 0 && rawBytes.byteLength === rawBytes.buffer.byteLength
        ? rawBytes
        : rawBytes.slice()
    return transfer(exactBytes, [exactBytes.buffer])
  },
}

expose(BrotliService)
