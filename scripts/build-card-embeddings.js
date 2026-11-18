import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import zlib from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { seriesMap } from '../src/maps/series-map.js'
import { packDatasetBinary, searchCatalog } from '../src/utils/visionSearch.js'
import { writeBrotliChunkedAsset } from './lib/brotliChunkedAsset.js'

const DIMS = 128

const loadEmbeddingCache = (cacheDir, game) => {
  const map = new Map()
  const metaPath = path.join(cacheDir, `${game}-cache.json`)
  const binPath = path.join(cacheDir, `${game}-cache.f32.bin`)
  if (!fs.existsSync(metaPath) || !fs.existsSync(binPath)) return map

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    const rawBuf = fs.readFileSync(binPath)
    const floats = new Float32Array(
      rawBuf.buffer,
      rawBuf.byteOffset,
      Math.floor(rawBuf.byteLength / 4)
    )
    for (const [key, info] of Object.entries(meta?.entries || {})) {
      const start = info.index * DIMS
      if (start + DIMS <= floats.length) {
        map.set(key, { sig: info.sig, vector: floats.slice(start, start + DIMS) })
      }
    }
  } catch {
    return new Map()
  }
  return map
}

const saveEmbeddingCache = (cacheDir, game, cacheMap) => {
  fs.mkdirSync(cacheDir, { recursive: true })
  const metaPath = path.join(cacheDir, `${game}-cache.json`)
  const binPath = path.join(cacheDir, `${game}-cache.f32.bin`)
  const metaTmp = `${metaPath}.tmp`
  const binTmp = `${binPath}.tmp`

  const floats = new Float32Array(cacheMap.size * DIMS)
  const entries = {}
  let idx = 0
  for (const [key, item] of cacheMap.entries()) {
    floats.set(item.vector, idx * DIMS)
    entries[key] = { sig: item.sig, index: idx }
    idx++
  }

  fs.writeFileSync(binTmp, new Uint8Array(floats.buffer, floats.byteOffset, floats.byteLength))
  fs.writeFileSync(metaTmp, JSON.stringify({ dims: DIMS, count: cacheMap.size, entries }))
  fs.renameSync(binTmp, binPath)
  fs.renameSync(metaTmp, metaPath)
}

const deduplicateCardEmbeddings = (baseId, versions, threshold = 0.97) => {
  if (!versions?.length) return []
  const ordered = [...versions].sort((a, b) => Number(b.isLowest) - Number(a.isLowest))
  const kept = []

  for (const item of ordered) {
    let dup = false
    for (const prev of kept) {
      let dot = 0
      for (let i = 0; i < item.vector.length; i++) dot += item.vector[i] * prev.vector[i]
      if (dot >= threshold) {
        dup = true
        break
      }
    }
    if (!dup) kept.push({ baseId, sourceId: item.id, vector: item.vector })
  }
  return kept
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const CARD_DATA_DIR = path.join(__dirname, '../src/assets/card-data')
const IMAGE_DATA_DIR = process.env.WS_IMAGE_DATA_DIR || 'E:/CF_R2/ws-image-data'
const MODEL_PATH = path.join(__dirname, '../src/assets/vision/milo.onnx')
const MANIFEST_OUTPUT_DIR = path.join(__dirname, '../public')
const OUTPUT_DIR = path.join(__dirname, '../public/vision')
const CACHE_DIR = path.join(__dirname, '../temp_build/vision-cache')
const GPU_WORKER_SCRIPT = path.join(__dirname, './gpu-embed-worker.py')
const DEDUP_THRESHOLD = 0.97
const VALID_GAMES = new Set(['ws', 'wsr', 'wsc'])

/**
 * Removes superseded embeddings/card_ids files for a game while keeping the current hash outputs.
 * @param {string} dir
 * @param {string} game
 * @param {Set<string>} keepFiles
 */
const pruneStaleDatasetFiles = (dir, game, keepFiles) => {
  if (!fs.existsSync(dir)) return
  for (const f of fs.readdirSync(dir)) {
    if (
      (f.startsWith(`${game}_embeddings.`) || f.startsWith(`${game}_card_ids.`)) &&
      !keepFiles.has(f)
    ) {
      fs.unlinkSync(path.join(dir, f))
    }
  }
}

const NON_LOWEST_RARITIES = new Set(['AGR'])
const isLowestRarityCard = (cardVersion, minIdLength) => {
  if (NON_LOWEST_RARITIES.has(cardVersion.rarity)) return false
  const id = cardVersion.id || ''
  const lastChar = id.slice(-1)
  if (lastChar >= 'A' && lastChar <= 'Z') return false
  return id.length === minIdLength
}

const ingestStreamIntoCache = (streamPath, resolveJob, game, cache) => {
  if (!fs.existsSync(streamPath)) return 0
  const buf = fs.readFileSync(streamPath)
  const recordBytes = 4 + DIMS * 4
  const numRecords = Math.floor(buf.byteLength / recordBytes)
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let okCount = 0
  for (let r = 0; r < numRecords; r++) {
    const off = r * recordBytes
    const jobIdx = dv.getUint32(off, true)
    const job = resolveJob(jobIdx)
    if (!job) continue
    const vec = new Float32Array(DIMS)
    for (let d = 0; d < DIMS; d++) {
      vec[d] = dv.getFloat32(off + 4 + d * 4, true)
    }
    cache.set(job.key, { sig: job.sig, vector: vec })
    okCount++
  }
  if (okCount > 0) saveEmbeddingCache(CACHE_DIR, game, cache)
  return okCount
}

const recoverInterruptedStream = (game, cache, pendingJobs) => {
  const jobsPath = path.join(CACHE_DIR, `${game}-pending.json`)
  const streamPath = path.join(CACHE_DIR, `${game}-pending-stream.bin`)
  if (!fs.existsSync(jobsPath) || !fs.existsSync(streamPath) || pendingJobs.length === 0) {
    return pendingJobs
  }
  try {
    const savedJobs = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'))
    const byPath = new Map(pendingJobs.map((j) => [j.imgPath, j]))
    const recovered = ingestStreamIntoCache(
      streamPath,
      (idx) => {
        const imgPath = savedJobs[idx]?.imgPath
        return imgPath ? byPath.get(imgPath) : null
      },
      game,
      cache
    )
    if (recovered > 0) {
      console.log(`   ♻️ Recovered ${recovered} cached embeddings from interrupted run`)
      return pendingJobs.filter((j) => {
        const hit = cache.get(j.key)
        return !hit || hit.sig !== j.sig
      })
    }
  } catch (err) {
    console.warn('   ⚠️ Failed to recover interrupted stream cache:', err?.message || err)
  }
  return pendingJobs
}

const runGpuInference = (jobs, game, cache, batchSize = 8) => {
  if (jobs.length === 0) return { failed: 0 }
  const uvCheck = spawnSync('uv', ['--version'], { stdio: 'ignore' })
  if (uvCheck.status !== 0) {
    throw new Error('uv is required to run scripts/gpu-embed-worker.py (NVIDIA CUDA GPU)')
  }
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error(`Missing MilO ONNX model at ${MODEL_PATH}`)
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const jobsPath = path.join(CACHE_DIR, `${game}-pending.json`)
  const streamPath = path.join(CACHE_DIR, `${game}-pending-stream.bin`)
  const gpuJobs = jobs.map((j, idx) => ({ idx, imgPath: j.imgPath }))
  fs.writeFileSync(jobsPath, JSON.stringify(gpuJobs))

  let okCount = 0
  try {
    const res = spawnSync(
      'uv',
      ['run', GPU_WORKER_SCRIPT, MODEL_PATH, jobsPath, streamPath, String(batchSize)],
      { stdio: 'inherit' }
    )

    okCount = ingestStreamIntoCache(streamPath, (idx) => jobs[idx], game, cache)

    if (res.status !== 0) {
      throw new Error(`gpu-embed-worker.py exited with status ${res.status}`)
    }
  } finally {
    try {
      fs.unlinkSync(jobsPath)
    } catch {
      // ignore cleanup error
    }
    try {
      fs.unlinkSync(streamPath)
    } catch {
      // ignore cleanup error
    }
  }

  return { failed: jobs.length - okCount }
}

const buildMain = async () => {
  const argGame = process.argv.find((a) => a.startsWith('--game='))?.split('=')[1]
  if (argGame && !VALID_GAMES.has(argGame)) {
    throw new Error(`Invalid --game="${argGame}". Expected one of: ws, wsr, wsc`)
  }
  const baseOnly = process.argv.includes('--base-only')
  const argBatch = Number(process.argv.find((a) => a.startsWith('--batch='))?.split('=')[1])
  const gpuBatchSize = Number.isFinite(argBatch) && argBatch >= 1 ? Math.floor(argBatch) : 8
  const targetGames = argGame ? [argGame] : ['ws', 'wsr', 'wsc']

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  fs.mkdirSync(MANIFEST_OUTPUT_DIR, { recursive: true })

  const prefixToGameMap = new Map()
  for (const series of Object.values(seriesMap)) {
    if (Array.isArray(series.prefixes)) {
      for (const prefix of series.prefixes) {
        prefixToGameMap.set(prefix.toLowerCase(), series.game)
      }
    }
  }

  const files = fs.readdirSync(CARD_DATA_DIR).filter((f) => f.endsWith('.json'))
  const groupsByGame = { ws: [], wsr: [], wsc: [] }

  for (const filename of files) {
    const prefix = filename.split('-')[0].toLowerCase()
    const game = prefixToGameMap.get(prefix) || 'ws'
    if (!groupsByGame[game]) continue
    const cardIdPrefix = filename.replace('.json', '')
    const content = JSON.parse(fs.readFileSync(path.join(CARD_DATA_DIR, filename), 'utf-8'))
    groupsByGame[game].push({ cardIdPrefix, content })
  }

  for (const game of targetGames) {
    const groups = groupsByGame[game] || []
    const tGameStart = performance.now()
    const cache = loadEmbeddingCache(CACHE_DIR, game)
    console.log(
      `\n🚀 Building ${game.toUpperCase()} (${groups.length} series, cache=${cache.size}, batch=${gpuBatchSize}${baseOnly ? ', base-only' : ''})...`
    )

    const cardTasks = []
    let pendingJobs = []
    let skippedMissing = 0
    let cacheHits = 0

    for (const { cardIdPrefix, content } of groups) {
      for (const [baseId, cardData] of Object.entries(content)) {
        const allCards = Array.isArray(cardData.all_cards) ? cardData.all_cards : []
        if (allCards.length === 0) continue

        const minIdLen = Math.min(...allCards.map((c) => (c.id ? c.id.length : Infinity)))
        const versions = []

        for (const cv of allCards) {
          if (!cv.id) continue
          const isLowest = isLowestRarityCard(cv, minIdLen)
          if (baseOnly && !isLowest) continue

          const fileName = `${cv.id.replace(/\//g, '-')}.webp`
          const relKey = `${cardIdPrefix}/${fileName}`
          const imgPath = path.join(IMAGE_DATA_DIR, cardIdPrefix, fileName)
          let stat = null
          try {
            stat = fs.statSync(imgPath)
          } catch {
            skippedMissing++
            continue
          }

          const sig = `${stat.size}:${Math.trunc(stat.mtimeMs)}`
          const cached = cache.get(relKey)
          if (cached && cached.sig === sig) {
            cacheHits++
          } else {
            pendingJobs.push({ id: pendingJobs.length, key: relKey, imgPath, sig })
          }
          versions.push({ id: cv.id, isLowest, key: relKey })
        }

        if (versions.length > 0) {
          cardTasks.push({ baseId, versions })
        }
      }
    }

    pendingJobs = recoverInterruptedStream(game, cache, pendingJobs)

    console.log(
      `   Cache hits: ${cacheHits}, Pending inference: ${pendingJobs.length}, Missing files: ${skippedMissing}`
    )

    let failed = 0
    if (pendingJobs.length > 0) {
      const gpuRes = runGpuInference(pendingJobs, game, cache, gpuBatchSize)
      failed = gpuRes.failed
    }

    const entries = []
    for (const task of cardTasks) {
      const embeddedVersions = []
      for (const v of task.versions) {
        const item = cache.get(v.key)
        if (item) {
          embeddedVersions.push({ id: v.id, isLowest: v.isLowest, vector: item.vector })
        }
      }
      const kept = deduplicateCardEmbeddings(task.baseId, embeddedVersions, DEDUP_THRESHOLD)
      for (const k of kept) entries.push(k)
    }

    const vectors = entries.map((e) => e.vector)
    const cardIds = entries.map((e) => e.baseId)
    let maxAbs = 0
    for (const v of vectors) {
      for (let i = 0; i < v.length; i++) {
        const a = Math.abs(v[i])
        if (a > maxAbs) maxAbs = a
      }
    }

    const packed = packDatasetBinary(vectors, maxAbs)
    const hash = crypto
      .createHash('sha256')
      .update(packed.buffer)
      .update(JSON.stringify(cardIds))
      .digest('hex')
      .slice(0, 8)

    const manifestFile = `${game}_vision_manifest.json`
    const cardIdsJson = JSON.stringify(cardIds)

    const embResult = writeBrotliChunkedAsset(
      OUTPUT_DIR,
      `${game}_embeddings`,
      hash,
      packed.buffer,
      zlib.constants.BROTLI_MODE_GENERIC
    )
    const idsResult = writeBrotliChunkedAsset(
      OUTPUT_DIR,
      `${game}_card_ids`,
      hash,
      cardIdsJson,
      zlib.constants.BROTLI_MODE_TEXT
    )
    pruneStaleDatasetFiles(OUTPUT_DIR, game, new Set([...embResult.files, ...idsResult.files]))

    const manifest = {
      version: `v${hash}`,
      hash,
      game,
      count: cardIds.length,
      dims: DIMS,
      int8Scale: maxAbs,
      int8Bytes: packed.int8Bytes,
      embeddingsFile: embResult.chunked ? embResult.files : embResult.files[0],
      embeddingsCompressedBytes: embResult.totalBytes,
      cardIdsFile: idsResult.chunked ? idsResult.files : idsResult.files[0],
      cardIdsCompressedBytes: idsResult.totalBytes,
    }
    fs.writeFileSync(
      path.join(MANIFEST_OUTPUT_DIR, manifestFile),
      `${JSON.stringify(manifest, null, 2)}\n`
    )

    const totalSec = ((performance.now() - tGameStart) / 1000).toFixed(1)
    console.log(
      `✅ ${game}: kept=${cardIds.length}, failed=${failed}, size=${(
        packed.buffer.byteLength /
        1024 /
        1024
      ).toFixed(2)} MB (${totalSec}s)`
    )

    if (cardIds.length > 0) {
      const int8Arr = new Int8Array(
        packed.buffer.buffer,
        packed.buffer.byteOffset,
        packed.int8Bytes
      )
      const sampleCount = Math.min(20, cardIds.length)
      let hitTop1 = 0
      for (let s = 0; s < sampleCount; s++) {
        const idx = Math.floor((s * cardIds.length) / sampleCount)
        const res = searchCatalog({
          query: vectors[idx],
          int8Data: int8Arr,
          count: cardIds.length,
          dims: DIMS,
          int8Scale: maxAbs,
          topK: 1,
        })
        if (res[0] && cardIds[res[0].index] === cardIds[idx]) hitTop1++
      }
      console.log(`   Self-retrieval Top-1 check: ${hitTop1}/${sampleCount}`)
    }
  }
}

buildMain().catch((err) => {
  console.error('❌ build-card-embeddings failed:', err)
  process.exit(1)
})
