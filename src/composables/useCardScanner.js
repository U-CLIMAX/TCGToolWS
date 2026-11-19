import { ref, watch, onUnmounted } from 'vue'
import { transfer } from 'comlink'
import { createManagedWorker } from '@/utils/workerManager'
import VisionWorker from '@/workers/vision.worker.js?worker'
import {
  computeCoverCropRect,
  computeRoiCaptureRect,
  mapRoiCornersToParent,
} from '@/utils/visionGeometry'
import { isDecisiveCandidate } from '@/utils/visionSearch'

const PERMISSION_ERRORS = new Set(['NotAllowedError', 'PermissionDeniedError', 'SecurityError'])
const DETECTOR_CAPTURE_SIZE = 384
const MAX_ROI_CAPTURE_EDGE = 640
const MAX_STATIC_IMAGE_EDGE = 960
const CAMERA_FRAME_INTERVAL_MS = 150
const CAMERA_WIDTH = 1280
const CAMERA_HEIGHT = 720
const CAMERA_INSTANT_LOCK = 0.84

const createSoftwareCanvasSlot = () => {
  let canvas = null
  let ctx = null
  return {
    capture: (source, sx, sy, sw, sh, outW, outH) => {
      if (!canvas && typeof document !== 'undefined') {
        canvas = document.createElement('canvas')
        ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true })
      }
      if (!ctx) return null
      // Grow-only backing store avoids reallocation churn when alternating 384x384 and ROI captures
      if (canvas.width < outW) canvas.width = outW
      if (canvas.height < outH) canvas.height = outH
      // Extract CPU RGBA pixels via software 2D canvas instead of transferring a video-backed ImageBitmap across workers
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outW, outH)
      const raw = ctx.getImageData(0, 0, outW, outH).data
      return raw.byteOffset === 0 && raw.byteLength === raw.buffer.byteLength ? raw : raw.slice()
    },
    release: () => {
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
      }
    },
  }
}

const managedVisionWorker = createManagedWorker(() => new VisionWorker(), {
  idleTimeout: 30_000,
})
let activeScannerInstances = 0

const createLockTracker = ({
  windowSize = 3,
  requiredHits = 2,
  instantThreshold = CAMERA_INSTANT_LOCK,
} = {}) => {
  const history = []
  return {
    reset: () => {
      history.length = 0
    },
    push: (result) => {
      const candidates = result?.candidates
      const top = candidates?.[0]
      if (!top) {
        history.push(null)
        if (history.length > windowSize) history.shift()
        return null
      }
      if (top.score >= instantThreshold) return top.cardId

      const isStrongHit = isDecisiveCandidate(candidates)

      history.push(isStrongHit ? top.cardId : null)
      if (history.length > windowSize) history.shift()
      if (!isStrongHit) return null

      let hits = 0
      for (const id of history) {
        if (id === top.cardId) hits++
      }
      return hits >= requiredHits ? top.cardId : null
    },
  }
}

const createInitCoordinator = ({
  isWorkerRunning,
  runWorkerInit,
  onStall,
  onStateChange,
  stallTimeoutMs = 25000,
}) => {
  let loadedGame = null
  let inFlightGame = null
  let inFlightPromise = null
  let activeClearStall = null
  let epoch = 0
  let state = { initializing: false, progress: 0 }

  const emitState = (patch) => {
    state = { ...state, ...patch }
    onStateChange?.(state)
  }

  const ensureReady = async (game, { force = false } = {}) => {
    if (force || !isWorkerRunning()) {
      loadedGame = null
    }
    if (!force && loadedGame === game && !inFlightPromise) return
    if (inFlightPromise && inFlightGame === game) {
      emitState({ initializing: true, progress: state.progress })
      return inFlightPromise
    }

    if (inFlightPromise) {
      await inFlightPromise.catch(() => {})
      if (!force && loadedGame === game && isWorkerRunning() && !inFlightPromise) {
        return
      }
      if (inFlightPromise && inFlightGame === game) {
        emitState({ initializing: true, progress: state.progress })
        return inFlightPromise
      }
    }

    const currentEpoch = ++epoch
    inFlightGame = game
    emitState({ initializing: true, progress: 0 })

    const run = (async () => {
      let stallTimer = null
      let rejectStall = null
      const stallPromise = new Promise((_, reject) => {
        rejectStall = reject
      })
      const refreshStallTimer = () => {
        if (stallTimer !== null) clearTimeout(stallTimer)
        stallTimer = setTimeout(() => {
          const err = new Error(
            `识别引擎初始化超时（停留在 ${state.progress}%），请检查控制台日志或重试`
          )
          onStall?.(err)
          rejectStall?.(err)
        }, stallTimeoutMs)
      }
      activeClearStall = () => {
        if (stallTimer !== null) {
          clearTimeout(stallTimer)
          stallTimer = null
        }
      }
      refreshStallTimer()

      try {
        await Promise.race([
          runWorkerInit(game, (ratio) => {
            if (currentEpoch === epoch) {
              refreshStallTimer()
              emitState({ progress: Math.max(0, Math.min(100, Math.round(ratio * 100))) })
            }
          }),
          stallPromise,
        ])
        if (currentEpoch === epoch) {
          loadedGame = game
          emitState({ initializing: false, progress: 100 })
        }
      } catch (err) {
        if (currentEpoch === epoch) {
          loadedGame = null
          emitState({ initializing: false })
        }
        throw err
      } finally {
        activeClearStall?.()
        activeClearStall = null
        if (inFlightPromise === run) {
          inFlightPromise = null
          inFlightGame = null
        }
      }
    })()

    inFlightPromise = run
    return run
  }

  const dispose = () => {
    epoch++
    activeClearStall?.()
    activeClearStall = null
    inFlightPromise = null
    inFlightGame = null
    emitState({ initializing: false })
  }

  return { ensureReady, dispose }
}

const openCameraStream = async ({ mediaDevices, shouldAbort = () => false }) => {
  const attempts = [
    {
      facingMode: 'environment',
      width: { ideal: CAMERA_WIDTH, max: CAMERA_WIDTH },
      height: { ideal: CAMERA_HEIGHT, max: CAMERA_WIDTH },
    },
    { facingMode: 'environment', width: { ideal: CAMERA_WIDTH }, height: { ideal: CAMERA_HEIGHT } },
    { width: { ideal: CAMERA_WIDTH }, height: { ideal: CAMERA_HEIGHT } },
  ]

  let lastError = null
  for (const video of attempts) {
    if (shouldAbort()) return null
    try {
      const stream = await mediaDevices.getUserMedia({ video, audio: false })
      if (shouldAbort()) {
        stream?.getTracks?.().forEach((t) => t.stop())
        return null
      }
      return stream
    } catch (err) {
      if (PERMISSION_ERRORS.has(err?.name)) throw err
      lastError = err
    }
  }

  throw lastError || new Error('No available camera device')
}

/**
 * Manages camera capture, static image decoding, and Worker inference lifecycle.
 * @param {import('vue').Ref<string>} gameRef
 */
export const useCardScanner = (gameRef) => {
  activeScannerInstances++
  const mode = ref(null) // null | 'camera' | 'image'
  const isInitializing = ref(false)
  const isStartingCamera = ref(false)
  const isScanning = ref(false)
  const initProgress = ref(0)
  const cameraError = ref(null)
  const scannerError = ref(null)

  const overlayCorners = ref(null)
  const overlayFrameSize = ref({ width: 0, height: 0 })
  const overlayLocked = ref(false)
  const candidates = ref([])
  const lockedCardId = ref(null)
  const hasStaticResult = ref(false)

  let mediaStream = null
  let rafId = null
  let frameTimerId = null
  let lastFrameStartedAt = 0
  const captureCanvasSlot = createSoftwareCanvasSlot()
  let videoElRef = null
  let cameraActive = false
  let inFlight = false
  let sessionToken = 0
  let pendingCameraOp = null
  let lastStreamStoppedAt = 0
  let activeFrameMeta = null
  let consecutiveFrameErrors = 0
  let recoveredUninit = false
  const lockTracker = createLockTracker()

  const stopOverlayListener = managedVisionWorker.onMessage((data) => {
    if (data?.type !== 'vision:corners') return
    if (!activeFrameMeta || activeFrameMeta.token !== sessionToken || lockedCardId.value) return
    activeFrameMeta.appliedOverlay = true
    overlayFrameSize.value = {
      width: activeFrameMeta.width,
      height: activeFrameMeta.height,
    }
    overlayCorners.value = data.corners
  })

  const initCoordinator = createInitCoordinator({
    isWorkerRunning: () => managedVisionWorker.isRunning(),
    runWorkerInit: async (game, onProgress) => {
      const stopProgress = managedVisionWorker.onMessage((data) => {
        if (data?.type === 'vision:progress') {
          onProgress(data.ratio)
        }
      })
      try {
        return await managedVisionWorker.run((api) => api.init(game))
      } catch (err) {
        console.error('[useCardScanner] Worker init failed:', err)
        managedVisionWorker.terminate(err)
        throw err
      } finally {
        stopProgress()
      }
    },
    onStall: (err) => {
      console.error('[useCardScanner] Worker init stalled:', err)
      managedVisionWorker.terminate(err)
    },
    onStateChange: (state) => {
      isInitializing.value = state.initializing
      initProgress.value = state.progress
    },
  })

  const stopLoop = () => {
    if (frameTimerId !== null) {
      clearTimeout(frameTimerId)
      frameTimerId = null
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const stopCamera = () => {
    sessionToken++
    stopLoop()
    captureCanvasSlot.release()
    lastFrameStartedAt = 0
    activeFrameMeta = null
    consecutiveFrameErrors = 0
    recoveredUninit = false
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop())
      mediaStream = null
      lastStreamStoppedAt = performance.now()
    }
    if (videoElRef) {
      videoElRef.pause?.()
      videoElRef.srcObject = null
      videoElRef.removeAttribute?.('src')
      videoElRef.load?.()
    }
    cameraActive = false
    isStartingCamera.value = false
    inFlight = false
  }

  const resetResult = () => {
    lockTracker.reset()
    overlayCorners.value = null
    overlayFrameSize.value = { width: 0, height: 0 }
    overlayLocked.value = false
    candidates.value = []
    lockedCardId.value = null
    scannerError.value = null
    hasStaticResult.value = false
    isScanning.value = false
  }

  const ensureWorkerReady = (opts) => {
    scannerError.value = null
    return initCoordinator.ensureReady(gameRef.value, opts)
  }

  const scheduleRaf = () => {
    if (rafId !== null || !cameraActive || lockedCardId.value) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      pumpFrame()
    })
  }

  const scheduleNextFrame = () => {
    if (frameTimerId !== null || rafId !== null || !cameraActive || lockedCardId.value) return
    const elapsed = lastFrameStartedAt > 0 ? performance.now() - lastFrameStartedAt : Infinity
    const waitMs = Math.max(0, CAMERA_FRAME_INTERVAL_MS - elapsed)
    if (waitMs > 0) {
      frameTimerId = setTimeout(() => {
        frameTimerId = null
        scheduleRaf()
      }, waitMs)
    } else {
      scheduleRaf()
    }
  }

  const getVisibleVideoCrop = (videoEl) => {
    const videoW = videoEl.videoWidth
    const videoH = videoEl.videoHeight
    if (!videoW || !videoH) return null
    return (
      computeCoverCropRect(videoW, videoH, videoEl.clientWidth, videoEl.clientHeight) || {
        sx: 0,
        sy: 0,
        sw: videoW,
        sh: videoH,
      }
    )
  }

  const pumpFrame = () => {
    if (!cameraActive || lockedCardId.value || !videoElRef || inFlight) return
    if (videoElRef.readyState < 2 || videoElRef.videoWidth <= 0) {
      scheduleNextFrame()
      return
    }

    inFlight = true
    lastFrameStartedAt = performance.now()
    const token = sessionToken
    const runFrame = async () => {
      if (!managedVisionWorker.isRunning()) {
        await ensureWorkerReady()
        if (token !== sessionToken || !cameraActive || lockedCardId.value) return null
      }
      const crop = getVisibleVideoCrop(videoElRef)
      if (!crop || token !== sessionToken || !cameraActive || lockedCardId.value) return null

      // Stage 1: capture 384x384 RGBA region (~0.56 MiB) for detector tracking without reallocating canvas
      const stage1Rgba = captureCanvasSlot.capture(
        videoElRef,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        DETECTOR_CAPTURE_SIZE,
        DETECTOR_CAPTURE_SIZE
      )
      if (!stage1Rgba) return null

      const meta = { token, width: crop.sw, height: crop.sh, appliedOverlay: false }
      activeFrameMeta = meta
      const stage1Res = await managedVisionWorker.run((api) =>
        api.scanFrame(
          transfer(stage1Rgba, [stage1Rgba.buffer]),
          DETECTOR_CAPTURE_SIZE,
          DETECTOR_CAPTURE_SIZE,
          crop.sw,
          crop.sh
        )
      )
      if (stage1Res.status !== 'need_crop') {
        return { res: stage1Res, width: crop.sw, height: crop.sh, meta, forceOverlay: false }
      }
      if (token !== sessionToken || !cameraActive || lockedCardId.value) return null

      // Stage 2: capture 1:1 ROI region reusing the same grow-only canvas slot
      const roi = computeRoiCaptureRect(crop, stage1Res.corners, MAX_ROI_CAPTURE_EDGE)
      if (!roi) return null
      const roiRgba = captureCanvasSlot.capture(
        videoElRef,
        roi.sx,
        roi.sy,
        roi.sw,
        roi.sh,
        roi.outW,
        roi.outH
      )
      if (!roiRgba || token !== sessionToken || !cameraActive || lockedCardId.value) return null

      const stage2Res = await managedVisionWorker.run((api) =>
        api.matchCardCrop(transfer(roiRgba, [roiRgba.buffer]), roi.outW, roi.outH)
      )
      return {
        res: {
          ...stage2Res,
          corners: mapRoiCornersToParent(stage2Res.corners, roi.normRect),
        },
        width: crop.sw,
        height: crop.sh,
        meta,
        forceOverlay: true,
      }
    }

    runFrame()
      .then((payload) => {
        if (!payload || token !== sessionToken || lockedCardId.value) return
        consecutiveFrameErrors = 0
        recoveredUninit = false
        const { res, width, height, meta, forceOverlay } = payload
        if (!meta.appliedOverlay || forceOverlay) {
          overlayFrameSize.value = { width, height }
          overlayCorners.value = res.corners
        }
        if (res.status === 'no_card') {
          if (res.skipped) return
          candidates.value = []
          lockTracker.push(res)
          return
        }
        candidates.value = res.candidates || []
        const locked = lockTracker.push(res)
        if (locked) {
          overlayLocked.value = true
          lockedCardId.value = locked
          stopLoop()
        }
      })
      .catch(async (err) => {
        if (token !== sessionToken) return
        consecutiveFrameErrors++
        if (err?.message?.includes('Vision worker not initialized') && !recoveredUninit) {
          recoveredUninit = true
          console.warn('[useCardScanner] Worker uninitialized on frame scan, recovering...')
          try {
            await ensureWorkerReady({ force: true })
            consecutiveFrameErrors = 0
            return
          } catch (recoverErr) {
            err = recoverErr
          }
        }
        console.error('[useCardScanner] Frame inference error:', err)
        if (recoveredUninit || consecutiveFrameErrors >= 3) {
          scannerError.value = err?.message || '视觉识别处理异常'
          stopCamera()
        }
      })
      .finally(() => {
        activeFrameMeta = null
        inFlight = false
        if (token === sessionToken && cameraActive && !lockedCardId.value) {
          scheduleNextFrame()
        }
      })
  }

  const startCamera = async (videoEl) => {
    if (!videoEl) return
    stopCamera()
    videoElRef = videoEl
    cameraError.value = null
    resetResult()
    const token = sessionToken

    if (!navigator.mediaDevices?.getUserMedia) {
      cameraError.value = '当前浏览器不支持摄像头访问，已切换至图片模式'
      mode.value = 'image'
      return
    }

    isStartingCamera.value = true

    const workerReadyPromise = ensureWorkerReady()
      .then(() => true)
      .catch((err) => {
        console.error('[useCardScanner] Engine init error:', err)
        if (token === sessionToken) {
          scannerError.value = err?.message || '视觉识别引擎初始化失败'
          isStartingCamera.value = false
        }
        return false
      })

    const openTask = (async () => {
      if (pendingCameraOp) {
        await Promise.race([
          pendingCameraOp.catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 400)),
        ])
        if (token !== sessionToken) return false
      }

      const sinceStop = performance.now() - lastStreamStoppedAt
      if (lastStreamStoppedAt > 0 && sinceStop < 60) {
        await new Promise((resolve) => setTimeout(resolve, 60 - sinceStop))
        if (token !== sessionToken) return false
      }

      const stream = await openCameraStream({
        mediaDevices: navigator.mediaDevices,
        shouldAbort: () => token !== sessionToken,
      })
      if (!stream) return false
      if (token !== sessionToken) {
        stream.getTracks().forEach((t) => t.stop())
        lastStreamStoppedAt = performance.now()
        return false
      }
      mediaStream = stream
      videoEl.srcObject = mediaStream
      try {
        await videoEl.play()
      } catch (playErr) {
        stopCamera()
        throw playErr
      }
      if (token !== sessionToken || !videoEl.isConnected) {
        stopCamera()
        return false
      }
      cameraActive = true
      return true
    })()

    pendingCameraOp = openTask

    let cameraOk = false
    let cameraErr = null
    try {
      cameraOk = await openTask
    } catch (err) {
      cameraErr = err
    } finally {
      if (pendingCameraOp === openTask) {
        pendingCameraOp = null
      }
      if (token === sessionToken) {
        isStartingCamera.value = false
      }
    }

    if (token !== sessionToken) return

    if (cameraErr) {
      console.error('[useCardScanner] Camera unavailable, falling back to image mode:', cameraErr)
      cameraError.value = '无法开启摄像头，请上传或粘贴卡片图片'
      mode.value = 'image'
      return
    }

    const workerOk = await workerReadyPromise
    if (token !== sessionToken) return
    if (!workerOk) {
      stopCamera()
      return
    }
    if (cameraOk && cameraActive) {
      scheduleNextFrame()
    }
  }

  const scanImageBlob = async (blob) => {
    if (!blob) return
    const token = ++sessionToken
    resetResult()
    isScanning.value = true
    let bitmap = null
    try {
      await ensureWorkerReady()
      if (token !== sessionToken) return
      bitmap = await createImageBitmap(blob)
      if (token !== sessionToken) return
      const scale = Math.min(1, MAX_STATIC_IMAGE_EDGE / Math.max(1, bitmap.width, bitmap.height))
      const outW = Math.max(1, Math.round(bitmap.width * scale))
      const outH = Math.max(1, Math.round(bitmap.height * scale))
      const rgba = captureCanvasSlot.capture(bitmap, 0, 0, bitmap.width, bitmap.height, outW, outH)
      bitmap.close?.()
      bitmap = null
      if (!rgba || token !== sessionToken) return
      const res = await managedVisionWorker.run((api) =>
        api.scanStaticImage(transfer(rgba, [rgba.buffer]), outW, outH)
      )
      if (token !== sessionToken) return
      candidates.value = res.candidates || []
      hasStaticResult.value = true
      if (res.status === 'matched' && res.candidates[0]) {
        lockedCardId.value = res.candidates[0].cardId
      }
    } catch (err) {
      console.error('[useCardScanner] Static image scan error:', err)
      if (token === sessionToken) {
        scannerError.value = err?.message || '图片识别失败'
      }
    } finally {
      bitmap?.close?.()
      captureCanvasSlot.release()
      if (token === sessionToken) {
        isScanning.value = false
      }
    }
  }

  // 监听游戏类型切换（如 /search/ws 切换至 /search/wsc）：立即释放旧游戏的视觉索引与 Worker 内存
  watch(gameRef, (nextGame, prevGame) => {
    if (prevGame && nextGame !== prevGame) {
      stopCamera()
      mode.value = null
      initCoordinator.dispose()
      managedVisionWorker.terminate()
    }
  })

  onUnmounted(() => {
    stopCamera()
    videoElRef = null
    stopOverlayListener()
    initCoordinator.dispose()
    activeScannerInstances = Math.max(0, activeScannerInstances - 1)
    if (activeScannerInstances === 0) {
      managedVisionWorker.terminate()
    }
  })

  return {
    mode,
    isInitializing,
    isStartingCamera,
    isScanning,
    initProgress,
    cameraError,
    scannerError,
    overlayCorners,
    overlayFrameSize,
    overlayLocked,
    candidates,
    lockedCardId,
    hasStaticResult,
    startCamera,
    stopCamera,
    scanImageBlob,
    resetResult,
  }
}
