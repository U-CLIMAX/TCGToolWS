import { expose } from 'comlink'
import ortWebgpuUrl from '@/assets/ort/ort.webgpu.min.mjs?url&no-inline'
import ortWasmMjsUrl from '@/assets/ort/ort-wasm-simd-threaded.asyncify.mjs?url&no-inline'
import ortWasmGzUrl from '@/assets/ort/ort-wasm-simd-threaded.asyncify.wasm.gz?url&no-inline'
import detectorModelUrl from '@/assets/vision/detector.onnx?url&no-inline'
import miloModelUrl from '@/assets/vision/milo.onnx?url&no-inline'
import {
  isValidCardQuad,
  orderCardCorners,
  computeQuadAspectRatio,
  dewarpRgba,
  rotateRgba,
  rgbaToNchw,
} from '@/utils/visionGeometry.js'
import {
  classifyMatchCandidates,
  isDecisiveCandidate,
  l2Normalize,
  searchCatalog,
} from '@/utils/visionSearch.js'
import {
  createByteAccumulator,
  fetchAndDecompressBrotliBytes,
  fetchAndDecompressBrotliText,
} from '@/utils/brotliStream.js'

const VISION_CACHE_NAME = 'tcg-vision-assets'
const DETECTOR_SIZE = 384
const MILO_SIZE = 448
const BOX_SHARPNESS_THRESHOLD = 0.02
const SHARPNESS_THRESHOLD = 0.024
const MIN_AREA_RATIO = 0.015
const MOTION_STABLE_RATIO = 0.07
const MAX_SHARED_WASM_PAGES = 8192 // 512 MiB (models peak ~87 MiB); avoids WebKit 4 GiB shared reservation OOM
const FALLBACK_SHARED_WASM_PAGES = 4096 // 256 MiB fallback under tight virtual address space

const isInvalidPayload = (buf) => {
  if (!buf || buf.byteLength === 0) return true
  const head = new Uint8Array(buf, 0, Math.min(80, buf.byteLength))
  let i = head.length >= 3 && head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf ? 3 : 0
  while (
    i < head.length &&
    (head[i] === 0x20 || head[i] === 0x09 || head[i] === 0x0a || head[i] === 0x0d)
  ) {
    i++
  }
  if (i >= head.length || head[i] !== 0x3c) return false
  const prefix = new TextDecoder().decode(head.subarray(i, i + 16)).toLowerCase()
  return prefix.startsWith('<!doctype') || prefix.startsWith('<html')
}

const isValidWasmMagic = (buf) => {
  if (!buf || buf.byteLength < 8) return false
  const b = new Uint8Array(buf, 0, 4)
  return b[0] === 0x00 && b[1] === 0x61 && b[2] === 0x73 && b[3] === 0x6d
}

const gunzipIfNeeded = async (buf) => {
  const bytes = new Uint8Array(buf, 0, Math.min(2, buf.byteLength))
  if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) return buf
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持 DecompressionStream，无法解压视觉运行时')
  }
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))
  return await new Response(stream).arrayBuffer()
}

let ortModule = null
let detectorSession = null
let miloSession = null
let activeBackend = 'wasm'

let currentGame = null
let datasetState = null
let initPromise = Promise.resolve()
let activeInit = null
let preferredCameraAngle = 0
let cameraAngleIdx = 0
let lastCameraCorners = null

const emitProgress = (stage, ratio) => {
  self.postMessage({ type: 'vision:progress', stage, ratio })
}

// Lazily initialized scratch canvases & buffers so browser/extension OffscreenCanvas errors surface cleanly via RPC
let scratchDetectorCanvas = null
let scratchDetectorCtx = null
let scratchCropCanvas = null
let scratchCropCtx = null
let scratchWorkCanvas = null
let scratchWorkCtx = null

const ensureScratchResources = () => {
  if (scratchDetectorCtx && scratchCropCtx && scratchWorkCtx) return
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('当前浏览器不支持 OffscreenCanvas，无法运行视觉识别')
  }
  scratchDetectorCanvas = new OffscreenCanvas(DETECTOR_SIZE, DETECTOR_SIZE)
  scratchDetectorCtx = scratchDetectorCanvas.getContext('2d', { willReadFrequently: true })
  scratchCropCanvas = new OffscreenCanvas(MILO_SIZE, MILO_SIZE)
  scratchCropCtx = scratchCropCanvas.getContext('2d', { willReadFrequently: true })
  scratchWorkCanvas = new OffscreenCanvas(640, 480)
  scratchWorkCtx = scratchWorkCanvas.getContext('2d', { willReadFrequently: true })
  if (!scratchDetectorCtx || !scratchCropCtx || !scratchWorkCtx) {
    throw new Error('无法初始化 OffscreenCanvas 2D 上下文，请检查浏览器隐私限制或扩展')
  }
}

const detectorNchwBuf = new Float32Array(3 * DETECTOR_SIZE * DETECTOR_SIZE)
const miloNchwBuf = new Float32Array(3 * MILO_SIZE * MILO_SIZE)
const dewarpCropBuf = new Uint8ClampedArray(MILO_SIZE * MILO_SIZE * 4)
const rotateCropBuf = new Uint8ClampedArray(MILO_SIZE * MILO_SIZE * 4)

const withTimeout = (promise, ms, label) => {
  let timer = null
  return Promise.race([
    promise.finally(() => {
      if (timer !== null) clearTimeout(timer)
    }),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    }),
  ])
}

const pruneStaleVisionCache = async (cache, game, manifest) => {
  if (!cache) return
  const toUrl = (p) => new URL(p, self.location.origin).href
  const activeOrtUrls = new Set([ortWasmGzUrl, detectorModelUrl, miloModelUrl].map(toUrl))
  const activeDatasetUrls = manifest
    ? new Set(
        [manifest.embeddingsFile, manifest.cardIdsFile]
          .flat()
          .filter(Boolean)
          .map((f) => toUrl(`/vision/${f}`))
      )
    : null

  const requests = await cache.keys()
  const deletions = []
  for (const req of requests) {
    const { pathname } = new URL(req.url)
    const isOrtAsset =
      (pathname.startsWith('/assets/detector.') && pathname.endsWith('.onnx')) ||
      (pathname.startsWith('/assets/milo.') && pathname.endsWith('.onnx')) ||
      (pathname.startsWith('/assets/ort-wasm-simd-threaded.asyncify.wasm.') &&
        pathname.endsWith('.gz'))

    if (isOrtAsset && !activeOrtUrls.has(req.url)) {
      deletions.push(cache.delete(req))
      continue
    }

    if (activeDatasetUrls) {
      const isCurrentGameDataset =
        pathname.startsWith(`/vision/${game}_embeddings.`) ||
        pathname.startsWith(`/vision/${game}_card_ids.`) ||
        pathname.startsWith(`/vision/datasets/${game}_`)
      if (isCurrentGameDataset && !activeDatasetUrls.has(req.url)) {
        deletions.push(cache.delete(req))
      }
    }
  }

  if (deletions.length > 0) await Promise.all(deletions)
}

const openVisionCacheSafe = () => {
  if (typeof caches === 'undefined') return Promise.resolve(null)
  return withTimeout(caches.open(VISION_CACHE_NAME), 2000, 'CacheStorage').catch((err) => {
    console.warn('[VisionWorker] CacheStorage unavailable, skipping Cache API:', err)
    return null
  })
}

const fetchBytesWithProgress = async (url, fallbackTotal, onBytes, stallTimeoutMs = 15000) => {
  const controller = new AbortController()
  let stallTimer = null
  const refreshStallTimer = () => {
    if (stallTimer !== null) clearTimeout(stallTimer)
    stallTimer = setTimeout(() => {
      controller.abort(new Error(`网络下载超时 (${stallTimeoutMs}ms): ${url}`))
    }, stallTimeoutMs)
  }

  refreshStallTimer()
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
    // Validate payload bytes via isInvalidPayload instead of Content-Type; Tauri falls back to text/html for .onnx
    const headerLen = Number(res.headers.get('content-length')) || 0
    const total = headerLen > 0 ? headerLen : fallbackTotal
    onBytes?.(0, total)

    if (!res.body?.getReader) {
      const buf = await res.arrayBuffer()
      if (isInvalidPayload(buf)) {
        throw new Error(`Invalid vision payload from ${url}`)
      }
      onBytes?.(buf.byteLength, buf.byteLength)
      return buf
    }

    const reader = res.body.getReader()
    const canPrealloc = headerLen > 0 && !res.headers.get('content-encoding')
    const accumulator = createByteAccumulator(canPrealloc ? headerLen : 0)
    let received = 0
    while (true) {
      refreshStallTimer()
      const { done, value } = await reader.read()
      if (done) break
      accumulator.push(value)
      received += value.byteLength
      onBytes?.(received, Math.max(total, received))
    }

    if (canPrealloc && received !== headerLen) {
      throw new Error(`Incomplete vision payload from ${url}: ${received}/${headerLen}`)
    }
    const view = accumulator.finish()
    const resultBuf =
      view.byteOffset === 0 && view.byteLength === view.buffer.byteLength
        ? view.buffer
        : view.slice().buffer
    if (isInvalidPayload(resultBuf)) {
      throw new Error(`Invalid vision payload from ${url}`)
    }
    onBytes?.(received, received)
    return resultBuf
  } finally {
    if (stallTimer !== null) clearTimeout(stallTimer)
  }
}

const writeVisionCache = async (cache, assetUrl, data) => {
  if (!cache || !data) return
  try {
    await cache.put(
      assetUrl,
      new Response(data, {
        headers: { 'Content-Type': 'application/octet-stream' },
      })
    )
  } catch (err) {
    console.warn('[VisionWorker] Cache write failed:', assetUrl, err)
  }
}

const commitPendingCache = async (cache, entries) => {
  if (!cache || !entries?.length) return
  await Promise.all(entries.map(([assetUrl, data]) => writeVisionCache(cache, assetUrl, data)))
  entries.length = 0
}

const fetchCachedAsset = async (
  cache,
  url,
  { fallbackTotal = 1_000_000, onBytes = null, gunzip = false, pendingCacheWrites = null } = {}
) => {
  const assetUrl = new URL(url, self.location.origin).href
  if (cache) {
    try {
      const hit = await cache.match(assetUrl)
      if (hit) {
        let buf = await hit.arrayBuffer()
        onBytes?.(buf.byteLength, buf.byteLength)
        if (gunzip) {
          buf = await gunzipIfNeeded(buf)
        }
        if (!isInvalidPayload(buf) && (!gunzip || isValidWasmMagic(buf))) {
          return buf
        }
        await cache.delete(assetUrl).catch(() => {})
      }
    } catch (err) {
      console.warn('[VisionWorker] Cache read failed:', assetUrl, err)
      await cache.delete(assetUrl).catch(() => {})
    }
  }

  let data = await fetchBytesWithProgress(assetUrl, fallbackTotal, onBytes)
  const rawForCache = data

  if (gunzip) {
    data = await gunzipIfNeeded(rawForCache)
    if (isInvalidPayload(data) || !isValidWasmMagic(data)) {
      throw new Error(`Invalid decompressed vision payload from ${assetUrl}`)
    }
  }

  if (cache) {
    if (pendingCacheWrites) {
      pendingCacheWrites.push([assetUrl, rawForCache])
    } else {
      await writeVisionCache(cache, assetUrl, rawForCache)
    }
  }
  return data
}

const warmupSingleSession = async (session, backingBuf, dims) => {
  const tensor = new ortModule.Tensor('float32', backingBuf, dims)
  let out = null
  try {
    out = await session.run({ [session.inputNames[0]]: tensor })
  } finally {
    tensor.dispose?.()
    if (out) Object.values(out).forEach((t) => t?.dispose?.())
  }
}

const createSessionWithTimeout = async (detBuf, miloBuf, eps, stepTimeoutMs) => {
  let det = null
  let milo = null
  const label = `ORT(${eps[0]})`
  try {
    det = await withTimeout(
      ortModule.InferenceSession.create(detBuf, {
        executionProviders: eps,
        logSeverityLevel: 3,
      }),
      stepTimeoutMs,
      `${label} detector create`
    )
    emitProgress('models', 0.72)
    await withTimeout(
      warmupSingleSession(det, detectorNchwBuf, [1, 3, DETECTOR_SIZE, DETECTOR_SIZE]),
      stepTimeoutMs,
      `${label} detector warmup`
    )
    emitProgress('models', 0.78)
    milo = await withTimeout(
      ortModule.InferenceSession.create(miloBuf, {
        executionProviders: eps,
        logSeverityLevel: 3,
      }),
      stepTimeoutMs,
      `${label} milo create`
    )
    emitProgress('models', 0.85)
    await withTimeout(
      warmupSingleSession(milo, miloNchwBuf, [1, 3, MILO_SIZE, MILO_SIZE]),
      stepTimeoutMs,
      `${label} milo warmup`
    )
    emitProgress('models', 0.92)
    return { det, milo }
  } catch (err) {
    await det?.release?.().catch(() => {})
    await milo?.release?.().catch(() => {})
    throw err
  }
}

/**
 * Caps ORT's 4 GiB shared WebAssembly.Memory reservation during initialization so WebKit/Safari
 * does not throw RangeError: Out of memory when another Wasm module (e.g. brotli-wasm) is loaded.
 */
const withCappedSharedWasmMemory = async (fn) => {
  const OrigMemory = WebAssembly.Memory
  WebAssembly.Memory = new Proxy(OrigMemory, {
    construct(Target, args, newTarget) {
      const [desc, ...rest] = args
      if (!desc?.shared || !(desc.maximum > MAX_SHARED_WASM_PAGES)) {
        return Reflect.construct(Target, args, newTarget)
      }
      const minPages = Math.max(1, desc.initial || 0)
      const primaryMax = Math.max(minPages, MAX_SHARED_WASM_PAGES)
      try {
        return Reflect.construct(Target, [{ ...desc, maximum: primaryMax }, ...rest], newTarget)
      } catch (err) {
        const fallbackMax = Math.max(minPages, FALLBACK_SHARED_WASM_PAGES)
        if (!(err instanceof RangeError) || fallbackMax >= primaryMax) throw err
        return Reflect.construct(Target, [{ ...desc, maximum: fallbackMax }, ...rest], newTarget)
      }
    },
  })
  try {
    return await fn()
  } finally {
    WebAssembly.Memory = OrigMemory
  }
}

const createSessionsWithFallback = async (detBuf, miloBuf, eps) =>
  withCappedSharedWasmMemory(async () => {
    try {
      const stepTimeoutMs = eps[0] === 'webgpu' ? 12000 : 15000
      const created = await createSessionWithTimeout(detBuf, miloBuf, eps, stepTimeoutMs)
      return { ...created, backend: eps[0] }
    } catch (err) {
      if (eps[0] === 'wasm') throw err
      console.warn(`[VisionWorker] Session init with ${eps[0]} failed, falling back to WASM:`, err)
      ortModule.env.webgpu.adapter = undefined
      try {
        const createdWasm = await createSessionWithTimeout(detBuf, miloBuf, ['wasm'], 15000)
        return { ...createdWasm, backend: 'wasm' }
      } catch (wasmErr) {
        if (wasmErr?.message?.includes("previous call to 'initWasm()' failed")) {
          throw err
        }
        throw new Error(`${err?.message || err} | fallback: ${wasmErr?.message || wasmErr}`)
      }
    }
  })

const initializeAssets = async (game) => {
  ensureScratchResources()
  const needOrt = !ortModule || !detectorSession || !miloSession
  const needDataset = currentGame !== game || !datasetState
  if (!needOrt && !needDataset) {
    emitProgress('ready', 0.98)
    return
  }

  const useCache = import.meta.env.PROD && import.meta.env.MODE !== 'tauri'
  emitProgress('ort', 0.05)

  const ortUrl = new URL(ortWebgpuUrl, self.location.origin).href
  const [cache, loadedOrt, manifestRes] = await Promise.all([
    useCache ? openVisionCacheSafe() : Promise.resolve(null),
    ortModule
      ? Promise.resolve(ortModule)
      : withTimeout(import(/* @vite-ignore */ ortUrl), 15000, 'ORT 模块加载'),
    needDataset
      ? withTimeout(fetch(`/${game}_vision_manifest.json`), 15000, '视觉索引清单加载')
      : Promise.resolve(null),
  ])

  let detBuf = null
  let miloBuf = null
  let wasmBuf = null
  let embBuf = null
  let cardIds = null
  let manifest = null

  if (!ortModule) {
    ortModule = loadedOrt
    ortModule.env.logLevel = 'error'
    ortModule.env.wasm.wasmPaths = {
      mjs: new URL(ortWasmMjsUrl, self.location.origin).href,
    }
    ortModule.env.wasm.numThreads = self.crossOriginIsolated
      ? Math.min(4, navigator.hardwareConcurrency || 2)
      : 1
  }

  if (needDataset) {
    const contentType = (manifestRes.headers.get('content-type') || '').toLowerCase()
    if (!manifestRes.ok || contentType.includes('text/html')) {
      throw new Error(
        `该游戏 (${game.toUpperCase()}) 尚未生成视觉索引，请先运行 npm run build:vision`
      )
    }
    manifest = await manifestRes.json()
  }

  // Aggregate byte-level download progress across the active stage window
  const progressByTask = new Map()
  let progressStage = 'models'
  let progressBase = 0.1
  let progressSpan = 0.5
  const reportDownloads = (id, loaded, total) => {
    progressByTask.set(id, { loaded, total: Math.max(1, total) })
    let sumLoaded = 0
    let sumTotal = 0
    for (const item of progressByTask.values()) {
      sumLoaded += item.loaded
      sumTotal += item.total
    }
    const ratio = sumTotal > 0 ? Math.min(1, sumLoaded / sumTotal) : 1
    emitProgress(progressStage, progressBase + ratio * progressSpan)
  }

  // Initialize ORT before loading brotli-wasm datasets so Safari/WebKit reserves ORT's shared Wasm memory first
  if (needOrt) {
    const pendingOrtCache = []
    try {
      await Promise.all([
        fetchCachedAsset(cache, ortWasmGzUrl, {
          fallbackTotal: 6_400_000,
          gunzip: true,
          pendingCacheWrites: pendingOrtCache,
          onBytes: (l, t) => reportDownloads('wasm', l, t),
        }).then((b) => {
          wasmBuf = b
        }),
        fetchCachedAsset(cache, detectorModelUrl, {
          fallbackTotal: 3_200_000,
          pendingCacheWrites: pendingOrtCache,
          onBytes: (l, t) => reportDownloads('det', l, t),
        }).then((b) => {
          detBuf = b
        }),
        fetchCachedAsset(cache, miloModelUrl, {
          fallbackTotal: 5_200_000,
          pendingCacheWrites: pendingOrtCache,
          onBytes: (l, t) => reportDownloads('milo', l, t),
        }).then((b) => {
          miloBuf = b
        }),
      ])

      if (wasmBuf) ortModule.env.wasm.wasmBinary = wasmBuf
      emitProgress('models', 0.62)

      const gpuAdapter =
        typeof navigator !== 'undefined' && navigator.gpu
          ? await withTimeout(
              navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }),
              2000,
              'WebGPU adapter'
            ).catch((err) => {
              console.warn('[VisionWorker] WebGPU adapter unavailable, using WASM:', err)
              return null
            })
          : null
      if (gpuAdapter) ortModule.env.webgpu.adapter = gpuAdapter
      const eps = gpuAdapter ? ['webgpu'] : ['wasm']

      const created = await createSessionsWithFallback(detBuf, miloBuf, eps)
      detectorSession = created.det
      miloSession = created.milo
      activeBackend = created.backend

      // Persist ORT runtime & models to CacheStorage only after session creation & warmup succeed
      await commitPendingCache(cache, pendingOrtCache)
    } finally {
      pendingOrtCache.length = 0
      detBuf = null
      miloBuf = null
      wasmBuf = null
      ortModule.env.wasm.wasmBinary = undefined
    }
  }

  if (needDataset && manifest) {
    progressByTask.clear()
    progressStage = 'dataset'
    progressBase = needOrt ? 0.92 : 0.1
    progressSpan = needOrt ? 0.05 : 0.85

    const expectedEmbBytes = (manifest.int8Offset || 0) + (manifest.int8Bytes || 0)
    const pendingDatasetCache = []
    const loadVisionDatasetFile = (
      fileOrChunks,
      { totalFallback, taskKey, asText = false, expectedBytes = 0 }
    ) => {
      const list = Array.isArray(fileOrChunks) ? fileOrChunks : [fileOrChunks]
      const chunkFallback = Math.max(1, Math.ceil(totalFallback / Math.max(1, list.length)))
      const chunkStats = list.map(() => ({ loaded: 0, total: chunkFallback }))

      const fetchResource = (url, idx) =>
        fetchCachedAsset(cache, url, {
          fallbackTotal: chunkFallback,
          pendingCacheWrites: pendingDatasetCache,
          onBytes: (loaded, total) => {
            chunkStats[idx] = { loaded, total: Math.max(1, total) }
            let sumLoaded = 0
            let sumTotal = 0
            for (const s of chunkStats) {
              sumLoaded += s.loaded
              sumTotal += s.total
            }
            reportDownloads(taskKey, sumLoaded, Math.max(totalFallback, sumTotal))
          },
        })

      const opts = { basePath: '/vision/', fetchResource, expectedBytes }
      return asText
        ? fetchAndDecompressBrotliText(list, opts)
        : fetchAndDecompressBrotliBytes(list, opts)
    }

    try {
      await Promise.all([
        loadVisionDatasetFile(manifest.embeddingsFile, {
          totalFallback: manifest.embeddingsCompressedBytes || 2_000_000,
          taskKey: 'emb',
          expectedBytes: expectedEmbBytes,
        }).then((b) => {
          embBuf = b
        }),
        loadVisionDatasetFile(manifest.cardIdsFile, {
          totalFallback: manifest.cardIdsCompressedBytes || 50_000,
          taskKey: 'ids',
          asText: true,
        }).then((jsonText) => {
          cardIds = JSON.parse(jsonText)
        }),
      ])

      if (embBuf.byteLength < expectedEmbBytes || !Array.isArray(cardIds)) {
        throw new Error(`Invalid vision dataset payload for ${game}`)
      }
      await commitPendingCache(cache, pendingDatasetCache)
    } finally {
      pendingDatasetCache.length = 0
    }

    emitProgress('dataset', 0.97)
    const int8Data = new Int8Array(
      embBuf.buffer,
      embBuf.byteOffset + (manifest.int8Offset || 0),
      manifest.int8Bytes
    )

    datasetState = {
      count: manifest.count,
      dims: manifest.dims,
      int8Scale: manifest.int8Scale,
      int8Data,
      cardIds,
    }
    currentGame = game
  }

  void pruneStaleVisionCache(cache, game, manifest).catch((err) => {
    console.warn('[VisionWorker] Cache prune failed:', err)
  })

  emitProgress('ready', 0.98)
}

const mergeCandidateMatches = (items, topK = 3) => {
  const bestByCard = new Map()
  for (const item of items) {
    const prev = bestByCard.get(item.cardId)
    if (prev === undefined || item.score > prev) bestByCard.set(item.cardId, item.score)
  }
  return [...bestByCard.entries()]
    .map(([cardId, score]) => ({ cardId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

const embedAndSearch = async (rgba448) => {
  rgbaToNchw(rgba448, MILO_SIZE, miloNchwBuf, true)
  const inputName = miloSession.inputNames[0]
  const outputName = miloSession.outputNames[0]
  const tensor = new ortModule.Tensor('float32', miloNchwBuf, [1, 3, MILO_SIZE, MILO_SIZE])
  let out = null
  let vec = null
  try {
    out = await miloSession.run({ [inputName]: tensor })
    vec = l2Normalize(out[outputName].data)
  } finally {
    tensor.dispose?.()
    out?.[outputName]?.dispose?.()
  }

  const rawMatches = searchCatalog({
    query: vec,
    int8Data: datasetState.int8Data,
    count: datasetState.count,
    dims: datasetState.dims,
    int8Scale: datasetState.int8Scale,
    topK: 5,
  })

  return rawMatches.map((m) => ({
    cardId: datasetState.cardIds[m.index],
    score: m.score,
  }))
}

const hasCornerShift = (prev, next, width, height) => {
  if (!prev || !next || prev.length < 8 || next.length < 8) return true
  const invW = 1 / Math.max(1, width)
  const invH = 1 / Math.max(1, height)
  for (let i = 0; i < 8; i += 2) {
    if (
      Math.abs(next[i] - prev[i]) * invW > MOTION_STABLE_RATIO ||
      Math.abs(next[i + 1] - prev[i + 1]) * invH > MOTION_STABLE_RATIO
    ) {
      return true
    }
  }
  return false
}

const matchWithOrientations = async (baseRgba448, isStatic, includeQuarterTurns = false) => {
  if (!isStatic) {
    const order = preferredCameraAngle === 180 ? [180, 0] : [0, 180]
    const angle = order[cameraAngleIdx % order.length]
    const rgba =
      angle === 0 ? baseRgba448 : rotateRgba(baseRgba448, MILO_SIZE, angle, rotateCropBuf)
    const res = await embedAndSearch(rgba)
    const candidates = mergeCandidateMatches(res, 3)
    const status = classifyMatchCandidates(candidates)
    if (status === 'matched') {
      preferredCameraAngle = angle
      cameraAngleIdx = 0
    } else {
      cameraAngleIdx = (cameraAngleIdx + 1) % order.length
    }
    return { status, candidates }
  }

  const initial = await embedAndSearch(baseRgba448)
  let collected = [...initial]

  if (!isDecisiveCandidate(initial)) {
    const extraAngles = includeQuarterTurns ? [180, 90, 270] : [180]
    for (const angle of extraAngles) {
      const rotated = rotateRgba(baseRgba448, MILO_SIZE, angle, rotateCropBuf)
      const res = await embedAndSearch(rotated)
      collected = collected.concat(res)
      if (isDecisiveCandidate(res)) break
    }
    if (!includeQuarterTurns && !isDecisiveCandidate(collected)) {
      for (const angle of [90, 270]) {
        const rotated = rotateRgba(baseRgba448, MILO_SIZE, angle, rotateCropBuf)
        const res = await embedAndSearch(rotated)
        collected = collected.concat(res)
        if (isDecisiveCandidate(res)) break
      }
    }
  }

  const candidates = mergeCandidateMatches(collected, 3)
  return { status: classifyMatchCandidates(candidates), candidates }
}

const detectCard = async (bitmap) => {
  scratchDetectorCtx.fillStyle = '#000'
  scratchDetectorCtx.fillRect(0, 0, DETECTOR_SIZE, DETECTOR_SIZE)
  scratchDetectorCtx.drawImage(bitmap, 0, 0, DETECTOR_SIZE, DETECTOR_SIZE)
  const imgData = scratchDetectorCtx.getImageData(0, 0, DETECTOR_SIZE, DETECTOR_SIZE)
  rgbaToNchw(imgData.data, DETECTOR_SIZE, detectorNchwBuf, true)

  const inputName = detectorSession.inputNames[0]
  const tensor = new ortModule.Tensor('float32', detectorNchwBuf, [
    1,
    3,
    DETECTOR_SIZE,
    DETECTOR_SIZE,
  ])
  let out = null
  const clamped = new Float32Array(8)
  let sharpness = 0
  try {
    out = await detectorSession.run({ [inputName]: tensor })
    const raw = out.corners.data
    for (let i = 0; i < 8; i++) {
      clamped[i] = Math.min(1, Math.max(0, raw[i]))
    }
    sharpness = out.sharpness?.data?.[0] ?? 0
  } finally {
    tensor.dispose?.()
    if (out) Object.values(out).forEach((t) => t?.dispose?.())
  }
  const corners = orderCardCorners(clamped, bitmap.width, bitmap.height)

  const quadAspect = corners ? computeQuadAspectRatio(corners, bitmap.width, bitmap.height) : 0
  const hasQuad =
    Boolean(corners) &&
    quadAspect >= 0.42 &&
    quadAspect <= 1.35 &&
    isValidCardQuad(corners, MIN_AREA_RATIO)
  const showBox = hasQuad && sharpness >= BOX_SHARPNESS_THRESHOLD
  const validForMatch = hasQuad && sharpness >= SHARPNESS_THRESHOLD
  return { valid: validForMatch, showBox, corners: showBox ? corners : null, sharpness }
}

const processImage = async (bitmap, allowBorderlessFallback, emitOverlay = false) => {
  try {
    ensureScratchResources()
    if (!detectorSession || !miloSession || !datasetState) {
      throw new Error('Vision worker not initialized')
    }
    const { valid, showBox, corners, sharpness } = await detectCard(bitmap)
    if (emitOverlay) {
      self.postMessage({ type: 'vision:corners', corners: showBox ? corners : null })
    }

    if (!allowBorderlessFallback) {
      if (!valid || !corners) {
        lastCameraCorners = showBox ? corners : null
        if (!showBox) {
          preferredCameraAngle = 0
          cameraAngleIdx = 0
        }
        return { status: 'no_card', corners: showBox ? corners : null, sharpness, candidates: [] }
      }
      // Skip heavy embedding inference while card is moving rapidly so green-box tracking stays responsive
      if (hasCornerShift(lastCameraCorners, corners, bitmap.width, bitmap.height)) {
        lastCameraCorners = corners
        return {
          status: 'no_card',
          skipped: true,
          corners: showBox ? corners : null,
          sharpness,
          candidates: [],
        }
      }
      lastCameraCorners = corners
    }

    let cropRes = null

    if (valid && corners) {
      const srcW = Math.min(bitmap.width, 960)
      const srcH = Math.max(1, Math.round((bitmap.height / Math.max(1, bitmap.width)) * srcW))
      if (scratchWorkCanvas.width !== srcW || scratchWorkCanvas.height !== srcH) {
        scratchWorkCanvas.width = srcW
        scratchWorkCanvas.height = srcH
      } else {
        scratchWorkCtx.clearRect(0, 0, srcW, srcH)
      }
      scratchWorkCtx.drawImage(bitmap, 0, 0, srcW, srcH)
      const srcRgba = scratchWorkCtx.getImageData(0, 0, srcW, srcH).data
      const crop = dewarpRgba(srcRgba, srcW, srcH, corners, MILO_SIZE, dewarpCropBuf)

      if (crop) {
        cropRes = await matchWithOrientations(crop, allowBorderlessFallback, false)
        if (cropRes.status === 'matched' || !allowBorderlessFallback) {
          return {
            status: cropRes.status,
            corners: showBox ? corners : null,
            sharpness,
            candidates: cropRes.candidates,
          }
        }
      }
    }

    if (!allowBorderlessFallback) {
      return { status: 'no_card', corners: showBox ? corners : null, sharpness, candidates: [] }
    }

    scratchCropCtx.fillStyle = '#000'
    scratchCropCtx.fillRect(0, 0, MILO_SIZE, MILO_SIZE)
    scratchCropCtx.drawImage(bitmap, 0, 0, MILO_SIZE, MILO_SIZE)
    const fullRgba = scratchCropCtx.getImageData(0, 0, MILO_SIZE, MILO_SIZE).data
    const fullRes = await matchWithOrientations(fullRgba, true, true)
    if (fullRes.status === 'matched') {
      return {
        status: 'matched',
        corners: null,
        sharpness,
        candidates: fullRes.candidates,
      }
    }

    const merged = mergeCandidateMatches([...(cropRes?.candidates || []), ...fullRes.candidates], 3)
    return {
      status: classifyMatchCandidates(merged),
      corners: showBox ? corners : null,
      sharpness,
      candidates: merged,
    }
  } finally {
    bitmap.close?.()
  }
}

const VisionService = {
  init: async (game) => {
    preferredCameraAngle = 0
    cameraAngleIdx = 0
    lastCameraCorners = null
    if (activeInit && activeInit.game === game) {
      return await activeInit.promise
    }

    const run = initPromise
      .catch(() => {})
      .then(async () => {
        await initializeAssets(game)
        console.info('[VisionWorker] Ready:', {
          game,
          backend: activeBackend,
          count: datasetState?.count ?? 0,
        })
        return { backend: activeBackend, count: datasetState.count }
      })
      .catch((err) => {
        console.error('[VisionWorker] Init failed:', err)
        throw err
      })

    activeInit = { game, promise: run }
    initPromise = run
    try {
      return await run
    } finally {
      if (activeInit?.promise === run) {
        activeInit = null
      }
    }
  },
  scanFrame: async (bitmap) => processImage(bitmap, false, true),
  scanStaticImage: async (bitmap) => processImage(bitmap, true, false),
}

expose(VisionService)
