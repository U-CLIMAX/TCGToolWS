import { snapdom } from '@zumer/snapdom'

export const convertElementToPng = async (elementId, name, scale = 1, embedFonts = false) => {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`Element with ID "${elementId}" not found.`)
    return
  }
  try {
    const rect = element.getBoundingClientRect()
    const options = {
      embedFonts: embedFonts,
      width: rect.width,
      height: rect.height,
      dpr: window.devicePixelRatio,
      scale: scale,
      type: 'png',
    }

    // WORKAROUND: Force-clear snapdom's cache before the actual capture.
    // A single call with `cache: 'disabled'` was not reliable. This two-step process ensures
    // that all stale assets are flushed by the first call, guaranteeing the second
    // call captures the latest DOM state accurately.

    // 1. Sacrificial call to clear caches. The result is intentionally ignored.
    // eslint-disable-next-line no-unused-vars
    const _ = await snapdom.toCanvas(element, {
      embedFonts: embedFonts,
      width: 1,
      height: 1,
      dpr: 1,
      cache: 'disabled',
    })

    // 2. The actual capture, now running with a clean cache.
    const result = await snapdom(element, options)

    await result.download({ format: 'png', filename: name })
  } catch (error) {
    console.error('Error during PNG conversion:', error)
    throw error
  }
}
