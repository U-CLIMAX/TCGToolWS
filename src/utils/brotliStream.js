let brotliPromise = null

const getBrotli = () => {
  if (!brotliPromise) {
    brotliPromise = import('brotli-wasm').then((mod) => mod.default)
  }
  return brotliPromise
}

const DEFAULT_CONCURRENCY = 4
const DEFAULT_OUTPUT_BUFFER_SIZE = 64 * 1024

const defaultFetchResource = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch error (${res.status}): ${url}`)
  return res
}

/**
 * Streams one or more Brotli-compressed files with bounded prefetch concurrency,
 * invoking onChunk(Uint8Array) sequentially in file order.
 * @param {string | string[]} files
 * @param {object} options
 * @param {(chunk: Uint8Array) => void} onChunk
 */
const streamBrotliDecompress = async (files, options, onChunk) => {
  const fileList = Array.isArray(files) ? files : [files]
  if (fileList.length === 0) return

  const {
    basePath = '/',
    onProgress,
    fetchResource = defaultFetchResource,
    concurrency = DEFAULT_CONCURRENCY,
    outputBufferSize = DEFAULT_OUTPUT_BUFFER_SIZE,
  } = options

  const brotli = await getBrotli()
  const decompressStream = new brotli.DecompressStream()
  const pendingFetches = new Array(fileList.length)

  const prefetch = (idx) => {
    if (idx >= fileList.length || pendingFetches[idx]) return
    const url = `${basePath}${fileList[idx]}`
    pendingFetches[idx] = Promise.resolve().then(() => fetchResource(url, idx, fileList.length))
  }

  const decompressChunk = (chunk) => {
    let inputOffset = 0
    let resultCode

    do {
      const input = inputOffset === 0 ? chunk : chunk.subarray(inputOffset)
      const result = decompressStream.decompress(input, outputBufferSize)
      try {
        const outBuf = result.buf
        if (outBuf.length > 0) onChunk(outBuf)
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

      const resource = await pendingFetches[i]
      if (resource instanceof ArrayBuffer) {
        if (resource.byteLength > 0) decompressChunk(new Uint8Array(resource))
        continue
      }
      if (ArrayBuffer.isView(resource)) {
        if (resource.byteLength > 0) {
          decompressChunk(new Uint8Array(resource.buffer, resource.byteOffset, resource.byteLength))
        }
        continue
      }
      if (!resource.body) {
        const buf = new Uint8Array(await resource.arrayBuffer())
        if (buf.length > 0) decompressChunk(buf)
        continue
      }

      const reader = resource.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value && value.length > 0) decompressChunk(value)
      }
    }
  } finally {
    for (let i = 0; i < pendingFetches.length; i++) {
      pendingFetches[i]?.catch(() => {})
    }
    decompressStream.free()
  }
}

/**
 * Fetches and decompresses Brotli-compressed file(s) into a single Uint8Array.
 * @param {string | string[]} files
 * @param {object} [options]
 * @returns {Promise<Uint8Array>}
 */
export const fetchAndDecompressBrotliBytes = async (files, options = {}) => {
  const chunks = []
  let totalLength = 0
  await streamBrotliDecompress(files, options, (outBuf) => {
    chunks.push(outBuf)
    totalLength += outBuf.byteLength
  })
  if (chunks.length === 1) return chunks[0]

  const merged = new Uint8Array(totalLength)
  let offset = 0
  for (let i = 0; i < chunks.length; i++) {
    merged.set(chunks[i], offset)
    offset += chunks[i].byteLength
  }
  return merged
}

/**
 * Fetches and decompresses Brotli-compressed file(s) into a UTF-8 string.
 * @param {string | string[]} files
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export const fetchAndDecompressBrotliText = async (files, options = {}) => {
  const textDecoder = new TextDecoder()
  const textChunks = []
  await streamBrotliDecompress(files, options, (outBuf) => {
    textChunks.push(textDecoder.decode(outBuf, { stream: true }))
  })
  const tail = textDecoder.decode()
  if (tail) textChunks.push(tail)
  return textChunks.join('')
}
