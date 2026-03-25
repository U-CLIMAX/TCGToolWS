import { snapdom } from '@zumer/snapdom'
import { normalizeFileName } from './sanitizeFilename'

export const convertElementToPng = async (
  elementId,
  name,
  scale = 1,
  embedFonts = false,
  download = true
) => {
  const element = document.getElementById(elementId)
  if (!element) return

  try {
    const rect = element.getBoundingClientRect()
    const options = {
      embedFonts,
      width: rect.width,
      height: rect.height,
      dpr: 1,
      scale,
    }

    // Force-clear snapdom's cache via a sacrificial call.
    await snapdom.toCanvas(element, {
      embedFonts,
      width: 1,
      height: 1,
      dpr: 1,
      cache: 'disabled',
    })

    const result = await snapdom(element, options)

    if (download) {
      const filename = normalizeFileName(name)
      await result.download({ format: 'png', filename })
    } else {
      return await result.toPng()
    }
  } catch (error) {
    console.error('PNG conversion failed:', error)
    throw error
  }
}
