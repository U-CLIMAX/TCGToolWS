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
 * Copy an image Blob to the clipboard.
 * @param {Blob} blob
 */
export async function writeImage(blob) {
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function' &&
    typeof window.ClipboardItem === 'function'
  ) {
    try {
      const item = new window.ClipboardItem({ 'image/png': blob })
      await navigator.clipboard.write([item])
      return
    } catch (e) {
      console.warn('[Clipboard] Native writeImage failed, falling back to polyfill:', e)
    }
  }

  // Fallback to polyfill
  const clipboard = await import('clipboard-polyfill')
  const item = new clipboard.ClipboardItem({ 'image/png': blob })
  await clipboard.write([item])
}
