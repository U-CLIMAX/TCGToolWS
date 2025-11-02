import { onMounted, onUnmounted, nextTick, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * A composable to preserve and restore the state of an infinite scroll list across navigations.
 * @param {object} options - The configuration options.
 * @param {import('vue').Ref<string>} options.storageKey - The key for sessionStorage.
 * @param {import('vue').Ref<any>} options.scrollRef - The ref to the scrollable element or component.
 * @param {() => any} options.onSave - A function that returns the state object to save.
 * @param {(state: any) => void} options.onRestore - A function that restores the state.
 * @param {import('vue').Ref<boolean>} [options.loadingRef] - An optional ref to a loading flag.
 * @param {boolean} [options.handleFreshNavigation=false] - Whether to handle the 'fresh' state from router history.
 */
export const useInfiniteScrollState = ({
  storageKey,
  scrollRef,
  onSave,
  onRestore,
  loadingRef,
}) => {
  let watcher = null

  const saveState = () => {
    if (scrollRef.value) {
      const stateToSave = onSave()
      if (stateToSave) {
        sessionStorage.setItem(storageKey.value, JSON.stringify(stateToSave))
      }
    }
  }

  onMounted(() => {
    const key = storageKey.value

    window.addEventListener('beforeunload', saveState)

    const tryRestore = () => {
      const savedStateJSON = sessionStorage.getItem(key)
      let stateToRestore = null

      if (savedStateJSON) {
        stateToRestore = JSON.parse(savedStateJSON)
      } else {
        // If no state is saved, create a default state to ensure scroll position is explicitly set to 0.
        stateToRestore = { scrollTop: 0, page: 1, itemCount: 0 }
      }

      nextTick(() => {
        if (scrollRef.value && stateToRestore) {
          onRestore(stateToRestore)
        }
      })
    }

    if (loadingRef) {
      watcher = watch(
        loadingRef,
        (loading) => {
          if (!loading) {
            tryRestore()
            if (watcher) {
              watcher()
            }
          }
        },
        { immediate: true }
      )
    } else {
      tryRestore()
    }

    onUnmounted(() => {
      window.removeEventListener('beforeunload', saveState)
    })
  })

  onBeforeRouteLeave(() => {
    saveState()
  })

  onUnmounted(() => {
    if (watcher) {
      watcher()
    }
  })
}
