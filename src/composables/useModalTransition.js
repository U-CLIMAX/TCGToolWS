import { ref, onUnmounted, nextTick } from 'vue'

/**
 * 组合式函数：协调弹窗（VDialog）或侧边抽屉（VNavigationDrawer）在进场动效完成后的任务调度。
 *
 * 采用原生 DOM `transitionend` 事件监听配合 Web Animations API（WAAPI）检测，
 * 并内置防御性超时保底机制，实现重度计算与数据请求与进场动画的解耦，
 * 避免移动端（如 Tauri Android WebView）在进场帧发生掉帧或卡顿。
 *
 * @param {object} [options] 配置选项
 * @param {number} [options.fallbackTimeout=350] 动画完成的最大保底等待毫秒数（应对无动画或减弱动效环境）
 * @returns {{
 *   isTransitionReady: import('vue').Ref<boolean>,
 *   waitForTransition: (targetElOrRef: any) => Promise<void>,
 *   reset: () => void
 * }}
 */
export const useModalTransition = (options = {}) => {
  const { fallbackTimeout = 350 } = options
  const isTransitionReady = ref(false)

  let timer = null
  let cleanupListener = null

  /**
   * 重置过渡状态并注销旧的监听器与保底计时器。
   */
  const reset = () => {
    isTransitionReady.value = false
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (cleanupListener) {
      cleanupListener()
      cleanupListener = null
    }
  }

  /**
   * 等待目标元素完成 CSS 过渡动画。
   *
   * @param {HTMLElement|import('vue').ComponentPublicInstance|import('vue').Ref} targetElOrRef
   * 目标 DOM 节点或 Vue 组件引用（自动向上查找 .v-overlay__content 或 .v-navigation-drawer）
   * @returns {Promise<void>} 过渡结束或超时保底触发时 resolve
   */
  const waitForTransition = (targetElOrRef) => {
    reset()

    return new Promise((resolve) => {
      const finish = () => {
        if (cleanupListener) {
          cleanupListener()
          cleanupListener = null
        }
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        isTransitionReady.value = true
        resolve()
      }

      // 防御性超时保底：防止在无过渡动效、动画被意外取消或启用了 prefers-reduced-motion 时永久挂起
      timer = setTimeout(finish, fallbackTimeout)

      nextTick(() => {
        const rawEl = targetElOrRef?.value?.$el || targetElOrRef?.value || targetElOrRef
        if (!rawEl || !(rawEl instanceof HTMLElement)) {
          // 若无法获取有效 DOM 节点，在下一帧完成
          requestAnimationFrame(finish)
          return
        }

        // 寻找真正执行 transform / opacity CSS 过渡的顶层容器
        const target = rawEl.closest('.v-overlay__content, .v-navigation-drawer') || rawEl

        // 若浏览器支持 Web Animations API 且目标当前并无运行中的过渡动效（例如桌面端已打开时切换卡牌），立即 resolve
        if (typeof target.getAnimations === 'function') {
          const runningAnimations = target
            .getAnimations({ subtree: true })
            .filter((a) => a.playState === 'running')
          if (runningAnimations.length === 0) {
            finish()
            return
          }
        }

        // 仅在目标过渡容器本身触发 transitionend 时结束，避免子元素的小幅 CSS 渐变意外触发
        const onTransitionEnd = (e) => {
          if (e.target === target) {
            finish()
          }
        }

        target.addEventListener('transitionend', onTransitionEnd, { once: true })
        cleanupListener = () => {
          target.removeEventListener('transitionend', onTransitionEnd)
        }
      })
    })
  }

  onUnmounted(reset)

  return {
    isTransitionReady,
    waitForTransition,
    reset,
  }
}
