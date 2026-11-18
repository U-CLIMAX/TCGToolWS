import { ref, onUnmounted } from 'vue'
import { transfer } from 'comlink'
import { createManagedWorker } from '@/utils/workerManager'
import VisionWorker from '@/workers/vision.worker.js?worker'
import { computeCoverCropRect } from '@/utils/visionGeometry'
import { isDecisiveCandidate, SCAN_THRESHOLDS } from '@/utils/visionSearch'

const PERMISSION_ERRORS = new Set(['NotAllowedError', 'PermissionDeniedError', 'SecurityError'])

const managedVisionWorker = createManagedWorker(() => new VisionWorker(), {
  idleTimeout: 600_000,
})

const createLockTracker = ({
  windowSize = 3,
  requiredHits = 2,
  instantThreshold = SCAN_THRESHOLDS.INSTANT_LOCK,
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
  let cachedInfo = null
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
      cachedInfo = null
    }
    if (!force && loadedGame === game && cachedInfo && !inFlightPromise) return cachedInfo
    if (inFlightPromise && inFlightGame === game) {
      emitState({ initializing: true, progress: state.progress })
      return inFlightPromise
    }

    if (inFlightPromise) {
      await inFlightPromise.catch(() => {})
      if (!force && loadedGame === game && cachedInfo && isWorkerRunning() && !inFlightPromise) {
        return cachedInfo
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
        const info = await Promise.race([
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
          cachedInfo = info
          emitState({ initializing: false, progress: 100 })
        }
        return info
      } catch (err) {
        if (currentEpoch === epoch) {
          loadedGame = null
          cachedInfo = null
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

const openCameraStream = async ({
  mediaDevices,
  width = 960,
  height = 540,
  shouldAbort = () => false,
}) => {
  const attempts = [
    { facingMode: 'environment', width: { ideal: width }, height: { ideal: height } },
    { width: { ideal: width }, height: { ideal: height } },
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
  const mode = ref('camera') // 'camera' | 'image'
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
  let videoElRef = null
  let cameraActive = false
  let inFlight = false
  let sessionToken = 0
  let pendingCameraOp = null
  let lastStreamStoppedAt = 0
  let activeFrameMeta = null
  let consecutiveFrameErrors = 0
  let recoveredUninit = false
  const lockTracker = createLockTracker({
    windowSize: 3,
    requiredHits: 2,
    instantThreshold: 0.84,
  })

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
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const stopCamera = () => {
    sessionToken++
    stopLoop()
    activeFrameMeta = null
    consecutiveFrameErrors = 0
    recoveredUninit = false
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop())
      mediaStream = null
      lastStreamStoppedAt = performance.now()
    }
    if (videoElRef) {
      videoElRef.srcObject = null
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

  const scheduleNextFrame = () => {
    if (rafId !== null || !cameraActive || lockedCardId.value) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      pumpFrame()
    })
  }

  const captureVisibleFrame = async (videoEl) => {
    const videoW = videoEl.videoWidth
    const videoH = videoEl.videoHeight
    const crop = computeCoverCropRect(videoW, videoH, videoEl.clientWidth, videoEl.clientHeight)
    if (crop) {
      const bitmap = await createImageBitmap(videoEl, crop.sx, crop.sy, crop.sw, crop.sh)
      return { bitmap, width: crop.sw, height: crop.sh }
    }
    const bitmap = await createImageBitmap(videoEl)
    return { bitmap, width: videoW, height: videoH }
  }

  const pumpFrame = () => {
    if (!cameraActive || lockedCardId.value || !videoElRef || inFlight) return
    if (videoElRef.readyState < 2 || videoElRef.videoWidth <= 0) {
      scheduleNextFrame()
      return
    }

    inFlight = true
    const token = sessionToken
    const runFrame = async () => {
      if (!managedVisionWorker.isRunning()) {
        await ensureWorkerReady()
        if (token !== sessionToken || !cameraActive || lockedCardId.value) return null
      }
      const captured = await captureVisibleFrame(videoElRef)
      let bitmap = captured.bitmap
      if (token !== sessionToken || lockedCardId.value) {
        bitmap.close?.()
        return null
      }
      const meta = { token, width: captured.width, height: captured.height, appliedOverlay: false }
      activeFrameMeta = meta
      try {
        const res = await managedVisionWorker.run((api) => {
          const transferred = bitmap
          bitmap = null
          return api.scanFrame(transfer(transferred, [transferred]))
        })
        return { res, width: captured.width, height: captured.height, meta }
      } finally {
        bitmap?.close?.()
      }
    }

    runFrame()
      .then((payload) => {
        if (!payload || token !== sessionToken || lockedCardId.value) return
        consecutiveFrameErrors = 0
        recoveredUninit = false
        const { res, width, height, meta } = payload
        if (!meta.appliedOverlay) {
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
        width: 960,
        height: 540,
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
      const res = await managedVisionWorker.run((api) => {
        const transferred = bitmap
        bitmap = null
        return api.scanStaticImage(transfer(transferred, [transferred]))
      })
      if (token !== sessionToken) return
      overlayCorners.value = res.corners
      candidates.value = res.candidates || []
      hasStaticResult.value = true
      if (res.status === 'matched' && res.candidates[0]) {
        overlayLocked.value = true
        lockedCardId.value = res.candidates[0].cardId
      }
    } catch (err) {
      console.error('[useCardScanner] Static image scan error:', err)
      if (token === sessionToken) {
        scannerError.value = err?.message || '图片识别失败'
      }
    } finally {
      bitmap?.close?.()
      if (token === sessionToken) {
        isScanning.value = false
      }
    }
  }

  onUnmounted(() => {
    stopCamera()
    videoElRef = null
    stopOverlayListener()
    initCoordinator.dispose()
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
