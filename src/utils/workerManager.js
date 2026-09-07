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
   */
  const terminate = () => {
    clearIdleTimer()
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
      workerInstance = createInstance()
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
    try {
      return await taskFn(api)
    } finally {
      release()
    }
  }

  return {
    getApi,
    acquire,
    release,
    terminate,
    run,
    getActiveTasks: () => activeTasks,
    isRunning: () => Boolean(workerInstance),
  }
}

export { wrap, transfer, releaseProxy }
