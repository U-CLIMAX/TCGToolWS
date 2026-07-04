import { expose } from 'comlink'
import JSONCrush from 'jsoncrush'
import { gzip, ungzip } from 'pako'

const deckProcessor = {
  /**
   * Compresses a deck data object into a Uint8Array.
   * @param {object} deckData - The raw deck data object.
   * @returns {Uint8Array} The compressed data.
   */
  compress(deckData) {
    const jsonString = JSON.stringify(deckData)
    const crushed = JSONCrush.crush(jsonString)
    // pako.gzip returns a Uint8Array by default, which is transferable.
    return gzip(crushed)
  },

  /**
   * Decompresses a Uint8Array back into a deck data object.
   * @param {Uint8Array} compressed - The compressed data.
   * @returns {object} The decompressed deck data object.
   */
  decompress(compressed) {
    const crushed = ungzip(compressed, { toText: true })
    const jsonString = JSONCrush.uncrush(crushed)
    return JSON.parse(jsonString)
  },
}

expose(deckProcessor)
