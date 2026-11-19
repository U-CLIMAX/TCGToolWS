const IMAGENET_SCALE_R = 1 / (255 * 0.229)
const IMAGENET_SCALE_G = 1 / (255 * 0.224)
const IMAGENET_SCALE_B = 1 / (255 * 0.225)
const IMAGENET_BIAS_R = -0.485 / 0.229
const IMAGENET_BIAS_G = -0.456 / 0.224
const IMAGENET_BIAS_B = -0.406 / 0.225

/**
 * Rotates CW corners cyclically so edge 0->1 is the physically shortest edge (portrait top edge).
 * Ensures standard TCG cards (e.g. tilted/landscape framing) normalize into portrait 0° or 180°.
 * @param {number[]} corners
 * @param {number} srcW
 * @param {number} srcH
 * @returns {number[]}
 */
const orientShortestEdgeTop = (corners, srcW, srcH) => {
  let shortestIdx = 0
  let shortestLen = Infinity
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4
    const dx = (corners[next * 2] - corners[i * 2]) * srcW
    const dy = (corners[next * 2 + 1] - corners[i * 2 + 1]) * srcH
    const len = Math.hypot(dx, dy)
    if (len < shortestLen) {
      shortestLen = len
      shortestIdx = i
    }
  }
  if (shortestIdx === 0) return corners
  const rotated = new Array(8)
  for (let i = 0; i < 4; i++) {
    const src = (shortestIdx + i) % 4
    rotated[i * 2] = corners[src * 2]
    rotated[i * 2 + 1] = corners[src * 2 + 1]
  }
  return rotated
}

/**
 * Sorts 4 normalized corners into cyclic clockwise perimeter order, enforces positive winding,
 * and rotates the quad so its physically shortest edge is at the top (0->1).
 * @param {ArrayLike<number>} corners
 * @param {number} [srcW=1]
 * @param {number} [srcH=1]
 * @returns {number[] | null}
 */
export const orderCardCorners = (corners, srcW = 1, srcH = 1) => {
  if (!corners || corners.length < 8) return null
  const pts = []
  let cx = 0
  let cy = 0
  for (let i = 0; i < 4; i++) {
    const x = corners[i * 2]
    const y = corners[i * 2 + 1]
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    cx += x
    cy += y
    pts.push({ x, y })
  }
  cx *= 0.25
  cy *= 0.25

  pts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx))

  let tlIdx = 0
  let minSum = pts[0].x + pts[0].y
  for (let i = 1; i < 4; i++) {
    const sum = pts[i].x + pts[i].y
    if (sum < minSum) {
      minSum = sum
      tlIdx = i
    }
  }

  let ordered = new Array(8)
  for (let i = 0; i < 4; i++) {
    const p = pts[(tlIdx + i) % 4]
    ordered[i * 2] = p.x
    ordered[i * 2 + 1] = p.y
  }

  let signedArea = 0
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4
    signedArea += ordered[i * 2] * ordered[next * 2 + 1] - ordered[next * 2] * ordered[i * 2 + 1]
  }
  if (signedArea < 0) {
    ordered = [
      ordered[0],
      ordered[1],
      ordered[6],
      ordered[7],
      ordered[4],
      ordered[5],
      ordered[2],
      ordered[3],
    ]
  }

  return orientShortestEdgeTop(ordered, Math.max(1, srcW), Math.max(1, srcH))
}

/**
 * Projects normalized [0..1] video-frame corners into canvas pixel coordinates under object-fit: cover.
 * @param {ArrayLike<number>} corners
 * @param {number} videoW
 * @param {number} videoH
 * @param {number} canvasW
 * @param {number} canvasH
 * @returns {number[]}
 */
export const mapCoverCorners = (corners, videoW, videoH, canvasW, canvasH) => {
  if (!videoW || !videoH || !canvasW || !canvasH) {
    return corners.map((v, i) => v * (i % 2 === 0 ? canvasW : canvasH))
  }
  const scale = Math.max(canvasW / videoW, canvasH / videoH)
  const renderedW = videoW * scale
  const renderedH = videoH * scale
  const offsetX = (renderedW - canvasW) * 0.5
  const offsetY = (renderedH - canvasH) * 0.5

  const out = new Array(8)
  for (let i = 0; i < 4; i++) {
    out[i * 2] = corners[i * 2] * renderedW - offsetX
    out[i * 2 + 1] = corners[i * 2 + 1] * renderedH - offsetY
  }
  return out
}

/**
 * Validates normalized [x0,y0..x3,y3] corners for finiteness, vertex separation, convexity, and area.
 * @param {ArrayLike<number>} corners
 * @param {number} [minAreaRatio=0.015]
 * @returns {boolean}
 */
export const isValidCardQuad = (corners, minAreaRatio = 0.015) => {
  if (!corners || corners.length < 8) return false
  for (let i = 0; i < 8; i++) {
    if (!Number.isFinite(corners[i])) return false
  }
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const dx = corners[i * 2] - corners[j * 2]
      const dy = corners[i * 2 + 1] - corners[j * 2 + 1]
      if (dx * dx + dy * dy < 0.0004) return false
    }
  }

  let sign = 0
  let area2 = 0
  for (let i = 0; i < 4; i++) {
    const x0 = corners[i * 2]
    const y0 = corners[i * 2 + 1]
    const x1 = corners[((i + 1) % 4) * 2]
    const y1 = corners[((i + 1) % 4) * 2 + 1]
    const x2 = corners[((i + 2) % 4) * 2]
    const y2 = corners[((i + 2) % 4) * 2 + 1]

    area2 += x0 * y1 - x1 * y0
    const cross = (x1 - x0) * (y2 - y1) - (y1 - y0) * (x2 - x1)
    if (Math.abs(cross) < 1e-6) return false
    const s = cross > 0 ? 1 : -1
    if (sign === 0) sign = s
    else if (sign !== s) return false
  }

  return Math.abs(area2) * 0.5 >= minAreaRatio
}

/**
 * Estimates physical width/height aspect ratio of the detected quadrilateral in pixel space.
 * @param {ArrayLike<number>} corners
 * @param {number} [srcW=1]
 * @param {number} [srcH=1]
 * @returns {number}
 */
export const computeQuadAspectRatio = (corners, srcW = 1, srcH = 1) => {
  const dist = (i, j) =>
    Math.hypot(
      (corners[j * 2] - corners[i * 2]) * srcW,
      (corners[j * 2 + 1] - corners[i * 2 + 1]) * srcH
    )
  const avgW = (dist(0, 1) + dist(3, 2)) * 0.5
  const avgH = (dist(0, 3) + dist(1, 2)) * 0.5
  return avgH > 1e-6 ? avgW / avgH : 1
}

/**
 * Solves 8x8 linear system A * x = b via Gaussian elimination with partial pivoting.
 * @param {number[][]} A
 * @param {number[]} b
 * @returns {Float64Array | null}
 */
const solveLinear8 = (A, b) => {
  const n = 8
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let maxRow = col
    let maxVal = Math.abs(M[col][col])
    for (let r = col + 1; r < n; r++) {
      const val = Math.abs(M[r][col])
      if (val > maxVal) {
        maxVal = val
        maxRow = r
      }
    }
    if (maxVal < 1e-10) return null
    if (maxRow !== col) {
      const tmp = M[col]
      M[col] = M[maxRow]
      M[maxRow] = tmp
    }
    const pivot = M[col][col]
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / pivot
      for (let c = col; c <= n; c++) {
        M[r][c] -= factor * M[col][c]
      }
    }
  }
  const x = new Float64Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n]
    for (let c = i + 1; c < n; c++) {
      sum -= M[i][c] * x[c]
    }
    x[i] = sum / M[i][i]
  }
  return x
}

/**
 * Solves 3x3 inverse homography mapping dst square [0..dstSize] -> normalized src [0..1].
 * @param {ArrayLike<number>} corners
 * @param {number} dstSize
 * @returns {Float64Array | null}
 */
const solveInverseHomography = (corners, dstSize) => {
  if (!isValidCardQuad(corners, 1e-4)) return null
  const dst = [
    [0, 0],
    [dstSize - 1, 0],
    [dstSize - 1, dstSize - 1],
    [0, dstSize - 1],
  ]
  const A = []
  const b = []
  for (let i = 0; i < 4; i++) {
    const [u, v] = dst[i]
    const x = corners[i * 2]
    const y = corners[i * 2 + 1]
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x])
    b.push(x)
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y])
    b.push(y)
  }
  const h = solveLinear8(A, b)
  if (!h) return null
  return new Float64Array([h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1])
}

/**
 * Perspective-warps a card quad from source RGBA buffer into a dstSize x dstSize RGBA crop.
 * @param {Uint8ClampedArray} srcRgba
 * @param {number} srcW
 * @param {number} srcH
 * @param {ArrayLike<number>} corners
 * @param {number} dstSize
 * @param {Uint8ClampedArray} [outBuf]
 * @returns {Uint8ClampedArray | null}
 */
export const dewarpRgba = (srcRgba, srcW, srcH, corners, dstSize, outBuf) => {
  const H = solveInverseHomography(corners, dstSize)
  if (!H) return null

  const neededLen = dstSize * dstSize * 4
  const out = outBuf && outBuf.length === neededLen ? outBuf : new Uint8ClampedArray(neededLen)
  const maxX = srcW - 1
  const maxY = srcH - 1
  const h0 = H[0]
  const h1 = H[1]
  const h2 = H[2]
  const h3 = H[3]
  const h4 = H[4]
  const h5 = H[5]
  const h6 = H[6]
  const h7 = H[7]

  for (let dy = 0; dy < dstSize; dy++) {
    const rowBase = dy * dstSize
    let px = h1 * dy + h2
    let py = h4 * dy + h5
    let pd = h7 * dy + 1

    for (let dx = 0; dx < dstSize; dx++) {
      if (Math.abs(pd) >= 1e-8) {
        const invDenom = 1 / pd
        const sx = px * invDenom * maxX
        const sy = py * invDenom * maxY

        const clampedX = sx < 0 ? 0 : sx > maxX ? maxX : sx
        const clampedY = sy < 0 ? 0 : sy > maxY ? maxY : sy
        const x0 = Math.floor(clampedX)
        const y0 = Math.floor(clampedY)
        const x1 = x0 < maxX ? x0 + 1 : maxX
        const y1 = y0 < maxY ? y0 + 1 : maxY
        const fx = clampedX - x0
        const fy = clampedY - y0
        const oneminusFx = 1 - fx
        const oneminusFy = 1 - fy

        const i00 = (y0 * srcW + x0) * 4
        const i10 = (y0 * srcW + x1) * 4
        const i01 = (y1 * srcW + x0) * 4
        const i11 = (y1 * srcW + x1) * 4
        const dstIdx = (rowBase + dx) * 4

        const w00 = oneminusFx * oneminusFy
        const w10 = fx * oneminusFy
        const w01 = oneminusFx * fy
        const w11 = fx * fy

        out[dstIdx] =
          srcRgba[i00] * w00 + srcRgba[i10] * w10 + srcRgba[i01] * w01 + srcRgba[i11] * w11
        out[dstIdx + 1] =
          srcRgba[i00 + 1] * w00 +
          srcRgba[i10 + 1] * w10 +
          srcRgba[i01 + 1] * w01 +
          srcRgba[i11 + 1] * w11
        out[dstIdx + 2] =
          srcRgba[i00 + 2] * w00 +
          srcRgba[i10 + 2] * w10 +
          srcRgba[i01 + 2] * w01 +
          srcRgba[i11 + 2] * w11
        out[dstIdx + 3] = 255
      }
      px += h0
      py += h3
      pd += h6
    }
  }
  return out
}

/**
 * Rotates a square RGBA buffer by 0, 90, 180, or 270 degrees clockwise.
 * @param {Uint8ClampedArray} rgba
 * @param {number} size
 * @param {0 | 90 | 180 | 270} angleDeg
 * @param {Uint8ClampedArray} [outBuf]
 * @returns {Uint8ClampedArray}
 */
export const rotateRgba = (rgba, size, angleDeg, outBuf) => {
  if (angleDeg === 0) return rgba
  const out = outBuf && outBuf.length === rgba.length ? outBuf : new Uint8ClampedArray(rgba.length)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let nx = x
      let ny = y
      if (angleDeg === 90) {
        nx = size - 1 - y
        ny = x
      } else if (angleDeg === 180) {
        nx = size - 1 - x
        ny = size - 1 - y
      } else if (angleDeg === 270) {
        nx = y
        ny = size - 1 - x
      }
      const srcIdx = (y * size + x) * 4
      const dstIdx = (ny * size + nx) * 4
      out[dstIdx] = rgba[srcIdx]
      out[dstIdx + 1] = rgba[srcIdx + 1]
      out[dstIdx + 2] = rgba[srcIdx + 2]
      out[dstIdx + 3] = rgba[srcIdx + 3]
    }
  }
  return out
}

/**
 * Converts square RGBA buffer to ImageNet-normalized NCHW [1, 3, size, size] Float32Array.
 * @param {Uint8ClampedArray} rgba
 * @param {number} size
 * @param {Float32Array} [outBuf]
 * @returns {Float32Array}
 */
export const rgbaToNchw = (rgba, size, outBuf) => {
  const plane = size * size
  const neededLen = 3 * plane
  const out = outBuf && outBuf.length === neededLen ? outBuf : new Float32Array(neededLen)
  for (let i = 0; i < plane; i++) {
    const p = i * 4
    out[i] = rgba[p] * IMAGENET_SCALE_R + IMAGENET_BIAS_R
    out[plane + i] = rgba[p + 1] * IMAGENET_SCALE_G + IMAGENET_BIAS_G
    out[2 * plane + i] = rgba[p + 2] * IMAGENET_SCALE_B + IMAGENET_BIAS_B
  }
  return out
}

/**
 * Bilinearly resizes an RGBA image to dstSize x dstSize and writes ImageNet-normalized NCHW.
 * @param {Uint8ClampedArray} srcRgba
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} dstSize
 * @param {Float32Array} [outBuf]
 * @returns {Float32Array}
 */
export const rgbaResizeToNchw = (srcRgba, srcW, srcH, dstSize, outBuf) => {
  const plane = dstSize * dstSize
  const neededLen = 3 * plane
  const out = outBuf && outBuf.length === neededLen ? outBuf : new Float32Array(neededLen)
  if (!srcW || !srcH || srcRgba.length < srcW * srcH * 4) return out
  if (srcW === dstSize && srcH === dstSize) {
    return rgbaToNchw(srcRgba, dstSize, out)
  }

  const scaleX = srcW / dstSize
  const scaleY = srcH / dstSize
  const maxX = srcW - 1
  const maxY = srcH - 1

  for (let dy = 0; dy < dstSize; dy++) {
    const sy = Math.min(maxY, Math.max(0, (dy + 0.5) * scaleY - 0.5))
    const y0 = Math.floor(sy)
    const y1 = y0 < maxY ? y0 + 1 : maxY
    const fy = sy - y0
    const oneMinusFy = 1 - fy
    const rowOffset = dy * dstSize

    for (let dx = 0; dx < dstSize; dx++) {
      const sx = Math.min(maxX, Math.max(0, (dx + 0.5) * scaleX - 0.5))
      const x0 = Math.floor(sx)
      const x1 = x0 < maxX ? x0 + 1 : maxX
      const fx = sx - x0
      const oneMinusFx = 1 - fx

      const w00 = oneMinusFx * oneMinusFy
      const w10 = fx * oneMinusFy
      const w01 = oneMinusFx * fy
      const w11 = fx * fy

      const i00 = (y0 * srcW + x0) * 4
      const i10 = (y0 * srcW + x1) * 4
      const i01 = (y1 * srcW + x0) * 4
      const i11 = (y1 * srcW + x1) * 4

      const r = srcRgba[i00] * w00 + srcRgba[i10] * w10 + srcRgba[i01] * w01 + srcRgba[i11] * w11
      const g =
        srcRgba[i00 + 1] * w00 +
        srcRgba[i10 + 1] * w10 +
        srcRgba[i01 + 1] * w01 +
        srcRgba[i11 + 1] * w11
      const b =
        srcRgba[i00 + 2] * w00 +
        srcRgba[i10 + 2] * w10 +
        srcRgba[i01 + 2] * w01 +
        srcRgba[i11 + 2] * w11

      const dstIdx = rowOffset + dx
      out[dstIdx] = r * IMAGENET_SCALE_R + IMAGENET_BIAS_R
      out[plane + dstIdx] = g * IMAGENET_SCALE_G + IMAGENET_BIAS_G
      out[2 * plane + dstIdx] = b * IMAGENET_SCALE_B + IMAGENET_BIAS_B
    }
  }
  return out
}

/**
 * Computes source crop rectangle inside a video element matching CSS object-fit: cover viewport.
 * @param {number} videoW
 * @param {number} videoH
 * @param {number} viewW
 * @param {number} viewH
 * @returns {{ sx: number, sy: number, sw: number, sh: number } | null}
 */
export const computeCoverCropRect = (videoW, videoH, viewW, viewH) => {
  if (!videoW || !videoH || !viewW || !viewH) return null
  const targetAspect = viewW / viewH
  const videoAspect = videoW / videoH
  if (Math.abs(targetAspect - videoAspect) < 1e-3) {
    return { sx: 0, sy: 0, sw: videoW, sh: videoH }
  }
  if (videoAspect > targetAspect) {
    const sw = Math.min(videoW, Math.max(1, Math.round(videoH * targetAspect)))
    const sx = Math.max(0, Math.min(videoW - sw, Math.floor((videoW - sw) * 0.5)))
    return { sx, sy: 0, sw, sh: videoH }
  }
  const sh = Math.min(videoH, Math.max(1, Math.round(videoW / targetAspect)))
  const sy = Math.max(0, Math.min(videoH - sh, Math.floor((videoH - sh) * 0.5)))
  return { sx: 0, sy, sw: videoW, sh }
}

/**
 * Computes a padded high-resolution ROI pixel rectangle inside crop for Stage 2 matching,
 * preserving 1:1 native video pixels up to maxEdge.
 * @param {{ sx: number, sy: number, sw: number, sh: number }} crop
 * @param {ArrayLike<number>} corners
 * @param {number} [maxEdge=640]
 * @param {number} [pad=0.12]
 */
export const computeRoiCaptureRect = (crop, corners, maxEdge = 640, pad = 0.12) => {
  if (!crop || !corners || corners.length < 8 || !crop.sw || !crop.sh) return null
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (let i = 0; i < 4; i++) {
    const x = corners[i * 2]
    const y = corners[i * 2 + 1]
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const padX = Math.max(0.04, (maxX - minX) * pad)
  const padY = Math.max(0.04, (maxY - minY) * pad)
  const u0 = Math.max(0, minX - padX)
  const v0 = Math.max(0, minY - padY)
  const u1 = Math.min(1, maxX + padX)
  const v1 = Math.min(1, maxY + padY)

  const sx = crop.sx + Math.max(0, Math.floor(u0 * crop.sw))
  const sy = crop.sy + Math.max(0, Math.floor(v0 * crop.sh))
  const ex = crop.sx + Math.min(crop.sw, Math.ceil(u1 * crop.sw))
  const ey = crop.sy + Math.min(crop.sh, Math.ceil(v1 * crop.sh))
  const sw = Math.max(1, ex - sx)
  const sh = Math.max(1, ey - sy)
  const scale = Math.min(1, maxEdge / Math.max(sw, sh))
  return {
    sx,
    sy,
    sw,
    sh,
    outW: Math.max(1, Math.round(sw * scale)),
    outH: Math.max(1, Math.round(sh * scale)),
    normRect: {
      u0: (sx - crop.sx) / crop.sw,
      v0: (sy - crop.sy) / crop.sh,
      uw: sw / crop.sw,
      vh: sh / crop.sh,
    },
  }
}

/**
 * Projects normalized [0..1] ROI corners back into parent crop normalized coordinates.
 * @param {ArrayLike<number> | null} localCorners
 * @param {{ u0: number, v0: number, uw: number, vh: number } | null} normRect
 * @returns {number[] | null}
 */
export const mapRoiCornersToParent = (localCorners, normRect) => {
  if (!localCorners || localCorners.length < 8 || !normRect) return localCorners
  const out = new Array(8)
  for (let i = 0; i < 4; i++) {
    out[i * 2] = normRect.u0 + localCorners[i * 2] * normRect.uw
    out[i * 2 + 1] = normRect.v0 + localCorners[i * 2 + 1] * normRect.vh
  }
  return out
}
