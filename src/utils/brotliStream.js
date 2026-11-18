let brotliPromise = null

const getBrotli = () => {
  if (!brotliPromise) {
    brotliPromise = import('brotli-wasm').then((mod) => mod.default)
  }
  return brotliPromise
}

const DEFAULT_CONCURRENCY = 4
const DEFAULT_OUTPUT_BUFFER_SIZE = 64 * 1024

/**
 * Fetches one or more Brotli-compressed files with bounded prefetch concurrency,
 * decompressing them in order into UTF-8 text.
 * @param {string | string[]} files - Public filename(s) to fetch in order
 * @param {object} [options]
 * @param {(current: number, total: number) => void} [options.onProgress] - Progress callback per file
 * @param {number} [options.concurrency] - Max concurrent fetch requests
 * @param {number} [options.outputBufferSize] - Brotli decompression buffer size in bytes
 * @returns {Promise<string>}
 */
export const fetchAndDecompressBrotliText = async (files, options = {}) => {
  const fileList = Array.isArray(files) ? files : [files]
  if (fileList.length === 0) return ''

  const {
    onProgress,
    concurrency = DEFAULT_CONCURRENCY,
    outputBufferSize = DEFAULT_OUTPUT_BUFFER_SIZE,
  } = options

  const brotli = await getBrotli()
  const decompressStream = new brotli.DecompressStream()
  const textDecoder = new TextDecoder()
  const textChunks = []
  const pendingFetches = new Array(fileList.length)

  const prefetch = (idx) => {
    if (idx >= fileList.length || pendingFetches[idx]) return
    const filename = fileList[idx]
    pendingFetches[idx] = fetch(`/${filename}`).then((res) => {
      if (!res.ok) throw new Error(`Fetch error (${res.status}): ${filename}`)
      return res
    })
  }

  const decompressChunk = (chunk) => {
    let inputOffset = 0
    let resultCode

    do {
      const input = inputOffset === 0 ? chunk : chunk.subarray(inputOffset)
      const result = decompressStream.decompress(input, outputBufferSize)
      try {
        const outBuf = result.buf
        if (outBuf.length > 0) {
          textChunks.push(textDecoder.decode(outBuf, { stream: true }))
        }
        resultCode = result.code
        inputOffset += result.input_offset
      } finally {
        result.free()
      }
    } while (resultCode === brotli.BrotliStreamResultCode.NeedsMoreOutput)

    if (
      resultCode !== brotli.BrotliStreamResultCode.NeedsMoreInput &&
      resultCode !== brotli.BrotliStreamResultCode.ResultSuccess
    ) {
      throw new Error(`Decompression failed with code ${resultCode}`)
    }
  }

  const initialCount = Math.min(concurrency, fileList.length)
  for (let i = 0; i < initialCount; i++) prefetch(i)

  try {
    for (let i = 0; i < fileList.length; i++) {
      prefetch(i + concurrency)
      if (onProgress) onProgress(i + 1, fileList.length)

      const response = await pendingFetches[i]
      if (!response.body) {
        const buf = new Uint8Array(await response.arrayBuffer())
        if (buf.length > 0) decompressChunk(buf)
        continue
      }

      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value && value.length > 0) decompressChunk(value)
      }
    }

    const tail = textDecoder.decode()
    if (tail) textChunks.push(tail)
    return textChunks.join('')
  } finally {
    // Suppress unhandled rejections on in-flight prefetches if an earlier chunk threw
    for (let i = 0; i < pendingFetches.length; i++) {
      pendingFetches[i]?.catch(() => {})
    }
    decompressStream.free()
  }
}
