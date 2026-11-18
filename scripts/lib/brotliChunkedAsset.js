import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

export const CHUNK_SIZE = 512 * 1024 // 512 KB

/**
 * Compresses data with Brotli max quality and writes it to outputDir as a single .bin
 * file or 512 KB .partN.bin chunks.
 * @param {string} outputDir
 * @param {string} baseName
 * @param {string} hash
 * @param {string | Buffer | Uint8Array} data
 * @param {number} [mode]
 * @returns {{ chunked: boolean, files: string[], totalBytes: number }}
 */
export const writeBrotliChunkedAsset = (
  outputDir,
  baseName,
  hash,
  data,
  mode = zlib.constants.BROTLI_MODE_TEXT
) => {
  const rawBuffer = Buffer.isBuffer(data)
    ? data
    : ArrayBuffer.isView(data)
      ? Buffer.from(data.buffer, data.byteOffset, data.byteLength)
      : Buffer.from(data, 'utf-8')

  const zippedContent = zlib.brotliCompressSync(rawBuffer, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      [zlib.constants.BROTLI_PARAM_MODE]: mode,
      [zlib.constants.BROTLI_PARAM_LGWIN]: zlib.constants.BROTLI_MAX_WINDOW_BITS,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: rawBuffer.length,
    },
  })

  const chunkCount = Math.ceil(zippedContent.length / CHUNK_SIZE)
  if (chunkCount <= 1) {
    const fileName = `${baseName}.${hash}.bin`
    fs.writeFileSync(path.join(outputDir, fileName), zippedContent)
    return { chunked: false, files: [fileName], totalBytes: zippedContent.length }
  }

  const files = []
  for (let i = 0; i < chunkCount; i++) {
    const chunk = zippedContent.subarray(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    const chunkFileName = `${baseName}.${hash}.part${i + 1}.bin`
    fs.writeFileSync(path.join(outputDir, chunkFileName), chunk)
    files.push(chunkFileName)
  }

  return { chunked: true, files, totalBytes: zippedContent.length }
}
