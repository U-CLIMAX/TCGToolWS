import { wrap, transfer, releaseProxy } from 'comlink'

const DEFAULT_IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

/**
 * Creates a managed Web Worker instance wrapped with Comlink.
 * Handles lazy initialization, reference counting for active tasks,
 * and automatic termination after an idle timeout.
 *
 * @template T
 * @param {new () => Worker | (() => Worker)} workerFactory - Worker constructor or factory function
 * @param {Object} [options]
 * @param {number} [options.idleTimeout=300000] - Inactivity duration (ms) before worker termination
 * @param {(worker: Worker) => import('comlink').Remote<T>} [options.wrapFn=wrap] - Custom wrapper function (defaults to Comlink.wrap)
 * @returns {{
 *   getApi: () => import('comlink').Remote<T>,
 *   acquire: () => import('comlink').Remote<T>,
 *   release: () => void,
 *   terminate: () => void,
 *   run: <R>(taskFn: (api: import('comlink').Remote<T>) => Promise<R> | R) => Promise<R>,
 *   onMessage: (listener: (data: any, event: MessageEvent) => void) => () => void,
 *   getActiveTasks: () => number,
 *   isRunning: () => boolean
 * }}
 */
export const createManagedWorker = (workerFactory, options = {}) => {
  const { idleTimeout = DEFAULT_IDLE_TIMEOUT, wrapFn = wrap } = options

  let workerInstance = null
  let wrappedWorker = null
  let idleTimer = null
  let activeTasks = 0
  const pendingRejectors = new Set()
  const messageListeners = new Set()

  const rejectPending = (err) => {
    if (!pendingRejectors.size) return
    const rejectors = [...pendingRejectors]
    pendingRejectors.clear()
    for (const reject of rejectors) {
      reject(err)
    }
  }

  /**
   * Instantiates the worker using constructor or factory function invocation.
   * @returns {Worker}
   */
  const createInstance = () => {
    if (typeof workerFactory !== 'function') {
      throw new TypeError('Worker factory must be a function or constructor')
    }
    if (workerFactory.prototype && workerFactory.prototype.constructor === workerFactory) {
      try {
        return new workerFactory()
      } catch (err) {
        if (err instanceof TypeError && /is not a constructor/.test(err.message)) {
          return workerFactory()
        }
        throw err
      }
    }
    return workerFactory()
  }

  /**
   * Clears the idle countdown timer if running.
   */
  const clearIdleTimer = () => {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  /**
   * Terminates the worker immediately and cleans up all references.
   * Rejects any in-flight tasks so callers never hang waiting for a dead worker.
   * @param {Error | null} [reasonError=null]
   */
  const terminate = (reasonError = null) => {
    clearIdleTimer()
    if (pendingRejectors.size > 0) {
      rejectPending(reasonError || new Error('Worker terminated while task was pending'))
    }
    if (wrappedWorker) {
      try {
        wrappedWorker[releaseProxy]?.()
      } catch {
        // ignore if already unsubscribed or unavailable
      }
    }
    if (workerInstance) {
      workerInstance.terminate()
      workerInstance = null
      wrappedWorker = null
    }
    activeTasks = 0
  }

  /**
   * Gets or initializes the Comlink wrapped worker instance.
   * Cancels any pending idle termination timer.
   * @returns {import('comlink').Remote<T>}
   */
  const getApi = () => {
    clearIdleTimer()
    if (!wrappedWorker) {
      try {
        workerInstance = createInstance()
      } catch (err) {
        console.error('[workerManager] Worker creation failed:', err)
        throw err
      }
      workerInstance.onerror = (event) => {
        const detail = [
          event?.message,
          event?.filename ? `${event.filename}:${event.lineno || 0}:${event.colno || 0}` : '',
          event?.error?.message,
        ]
          .filter(Boolean)
          .join(' | ')
        const err = new Error(`Worker 运行异常${detail ? `: ${detail}` : ' (详见控制台)'}`)
        console.error('[workerManager] Worker runtime error, resetting instance:', event)
        terminate(err)
      }
      workerInstance.onmessageerror = (event) => {
        const err = new Error('Worker 消息传递失败 (onmessageerror)')
        console.error('[workerManager] Worker message error, resetting instance:', event)
        terminate(err)
      }
      workerInstance.addEventListener('message', (event) => {
        for (const listener of messageListeners) {
          try {
            listener(event.data, event)
          } catch (err) {
            console.error('[workerManager] Message listener error:', err)
          }
        }
      })
      wrappedWorker = wrapFn(workerInstance)
    }
    return wrappedWorker
  }

  /**
   * Acquires the worker instance and increments the active task count.
   * @returns {import('comlink').Remote<T>}
   */
  const acquire = () => {
    const api = getApi()
    activeTasks++
    return api
  }

  /**
   * Decrements active task count and schedules worker termination if idle.
   */
  const release = () => {
    activeTasks = Math.max(0, activeTasks - 1)
    if (activeTasks === 0 && workerInstance) {
      clearIdleTimer()
      if (Number.isFinite(idleTimeout) && idleTimeout >= 0) {
        idleTimer = setTimeout(() => {
          terminate()
        }, idleTimeout)
      }
    }
  }

  /**
   * Executes a task function with the worker API, ensuring automatic acquire and release.
   *
   * @template R
   * @param {(api: import('comlink').Remote<T>) => Promise<R> | R} taskFn
   * @returns {Promise<R>}
   */
  const run = async (taskFn) => {
    const api = acquire()
    let rejectTask
    const abortPromise = new Promise((_, reject) => {
      rejectTask = reject
    })
    pendingRejectors.add(rejectTask)
    try {
      return await Promise.race([Promise.resolve().then(() => taskFn(api)), abortPromise])
    } finally {
      pendingRejectors.delete(rejectTask)
      release()
    }
  }

  return {
    getApi,
    acquire,
    release,
    terminate,
    run,
    onMessage: (listener) => {
      messageListeners.add(listener)
      return () => messageListeners.delete(listener)
    },
    getActiveTasks: () => activeTasks,
    isRunning: () => Boolean(workerInstance),
  }
}

export { wrap, transfer, releaseProxy }
