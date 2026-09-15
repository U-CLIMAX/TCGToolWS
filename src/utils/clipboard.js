/**
 * Centralized clipboard utility with native API priority and clipboard-polyfill fallback.
 */

/**
 * Copy text to the clipboard.
 * @param {string} text
 */
export async function writeText(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch (e) {
      console.warn('[Clipboard] Native writeText failed, falling back to polyfill:', e)
    }
  }

  // Fallback to polyfill
  const clipboard = await import('clipboard-polyfill')
  await clipboard.writeText(text)
}

/**
 * Copy an image Blob or Promise<Blob> to the clipboard.
 * Supports Safari async user activation by passing Promise directly into ClipboardItem.
 * @param {Blob | Promise<Blob>} blobOrPromise
 */
export async function writeImage(blobOrPromise) {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function' &&
    typeof window.ClipboardItem !== 'undefined'
  ) {
    try {
      const item = new window.ClipboardItem({
        'image/png': Promise.resolve(blobOrPromise),
      })
      await navigator.clipboard.write([item])
      return
    } catch (e) {
      console.warn('[Clipboard] Native writeImage failed, falling back to polyfill:', e)
    }
  }

  // Fallback to polyfill (requires resolved Blob instance)
  const blob = await Promise.resolve(blobOrPromise)
  const clipboard = await import('clipboard-polyfill')
  const item = new clipboard.ClipboardItem({ 'image/png': blob })
  await clipboard.write([item])
}
