const l2Normalize = (vec) => {
  const out = new Float32Array(vec.length)
  let sumSq = 0
  for (let i = 0; i < vec.length; i++) {
    const val = vec[i]
    if (!Number.isFinite(val)) return out
    sumSq += val * val
  }
  if (!Number.isFinite(sumSq) || sumSq <= 1e-12) return out
  const invNorm = 1 / Math.sqrt(sumSq)
  for (let i = 0; i < vec.length; i++) {
    out[i] = vec[i] * invNorm
  }
  return out
}

const quantizeVectorInt8 = (vec, scale) => {
  const out = new Int8Array(vec.length)
  if (!scale || scale <= 0) return out
  const invScale = 127 / scale
  for (let i = 0; i < vec.length; i++) {
    const scaled = Math.round(vec[i] * invScale)
    out[i] = scaled > 127 ? 127 : scaled < -127 ? -127 : scaled
  }
  return out
}

/**
 * Packs quantized int8 vectors into one contiguous buffer.
 * @param {Float32Array[]} vectors
 * @param {number} scale
 * @returns {{ buffer: Uint8Array, int8Bytes: number }}
 */
export const packDatasetBinary = (vectors, scale) => {
  const count = vectors.length
  const dims = count > 0 ? vectors[0].length : 128
  const int8Bytes = count * dims
  const buffer = new Uint8Array(int8Bytes)
  const int8View = new Int8Array(buffer.buffer, 0, int8Bytes)

  for (let i = 0; i < count; i++) {
    int8View.set(quantizeVectorInt8(vectors[i], scale), i * dims)
  }

  return { buffer, int8Bytes }
}

const SCAN_THRESHOLDS = {
  HIGH_CONFIDENCE: 0.68,
  MARGIN_SCORE: 0.55,
  MIN_MARGIN: 0.04,
  LOW_CONFIDENCE: 0.48,
}

const computeCandidateMargin = (candidates) => {
  if (!candidates?.length) return 0
  const top = candidates[0]
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].cardId !== top.cardId) return top.score - candidates[i].score
  }
  return top.score
}

export const isDecisiveCandidate = (candidates) => {
  const top1 = candidates[0]?.score ?? 0
  return (
    top1 >= SCAN_THRESHOLDS.HIGH_CONFIDENCE ||
    (top1 >= SCAN_THRESHOLDS.MARGIN_SCORE &&
      computeCandidateMargin(candidates) >= SCAN_THRESHOLDS.MIN_MARGIN)
  )
}

export const classifyMatchCandidates = (candidates) => {
  if (isDecisiveCandidate(candidates)) return 'matched'
  return (candidates[0]?.score ?? 0) >= SCAN_THRESHOLDS.LOW_CONFIDENCE
    ? 'low_confidence'
    : 'no_card'
}

const pushTopK = (top, index, score, limitTop) => {
  if (top.length >= limitTop && score <= top[limitTop - 1].score) return
  let pos = top.length
  while (pos > 0 && top[pos - 1].score < score) pos--
  top.splice(pos, 0, { index, score })
  if (top.length > limitTop) top.pop()
}

/**
 * Runs an exact Int8 quantized cosine similarity scan across the entire catalog.
 * Uses an 8x-unrolled inner loop (~8ms on 63K 128-d vectors in V8) to avoid coarse Hamming drops.
 * @param {Object} params
 * @param {Float32Array} params.query
 * @param {Int8Array} params.int8Data
 * @param {number} params.count
 * @param {number} [params.dims=128]
 * @param {number} params.int8Scale
 * @param {number} [params.topK=5]
 * @returns {Array<{ index: number, score: number }>}
 */
export const searchCatalog = ({ query, int8Data, count, dims = 128, int8Scale, topK = 5 }) => {
  if (!count || count <= 0) return []

  const qNorm = l2Normalize(query)
  const factor = int8Scale > 0 ? int8Scale / 127 : 0
  const limitTop = Math.min(topK, count)
  const top = []
  const fast8 = dims % 8 === 0

  for (let i = 0; i < count; i++) {
    const base = i * dims
    let dot = 0
    if (fast8) {
      for (let d = 0; d < dims; d += 8) {
        dot +=
          qNorm[d] * int8Data[base + d] +
          qNorm[d + 1] * int8Data[base + d + 1] +
          qNorm[d + 2] * int8Data[base + d + 2] +
          qNorm[d + 3] * int8Data[base + d + 3] +
          qNorm[d + 4] * int8Data[base + d + 4] +
          qNorm[d + 5] * int8Data[base + d + 5] +
          qNorm[d + 6] * int8Data[base + d + 6] +
          qNorm[d + 7] * int8Data[base + d + 7]
      }
    } else {
      for (let d = 0; d < dims; d++) {
        dot += qNorm[d] * int8Data[base + d]
      }
    }
    pushTopK(top, i, dot * factor, limitTop)
  }

  return top
}
