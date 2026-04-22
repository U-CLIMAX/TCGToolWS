/**
 * Pinia Versioning Plugin
 *
 * This plugin checks for a version mismatch between the store's code
 * and the persisted state in localStorage. If a mismatch is found,
 * it clears the persisted state for that specific store, forcing it
 * to re-initialize with the new state structure.
 *
 * This prevents bugs that can occur when a new version of the application
 * is deployed with changes to a store's state shape, which would otherwise
 * cause errors when rehydrating from an older, incompatible localStorage state.
 *
 * To use it:
 * 1. Add a `version` number property to your store's state.
 * 2. Increment the `version` number whenever you make a breaking change
 *    to the store's state structure.
 */
export const piniaVersioningPlugin = ({ store }) => {
  // Check if the store has a version property
  if (Object.prototype.hasOwnProperty.call(store.$state, 'version')) {
    const storeId = store.$id
    const codeVersion = store.$state.version

    try {
      const persistedStateJSON = localStorage.getItem(storeId)

      if (persistedStateJSON) {
        const persistedState = JSON.parse(persistedStateJSON)
        const persistedVersion = persistedState.version

        // If versions don't match or persisted version doesn't exist,
        // clear the stored state.
        if (persistedVersion !== codeVersion) {
          console.log(
            `[Pinia Versioning] Store "${storeId}" version mismatch. ` +
              `Code: ${codeVersion}, Persisted: ${persistedVersion}. ` +
              `Clearing persisted state.`
          )
          localStorage.removeItem(storeId)
          window.location.href = '/home'
        }
      }
    } catch (error) {
      console.error(`[Pinia Versioning] Error processing store "${storeId}":`, error)
      // If parsing fails, it's safer to clear the corrupted state.
      localStorage.removeItem(storeId)
    }
  }
}
