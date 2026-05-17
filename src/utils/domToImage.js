import { snapdom } from '@zumer/snapdom'
import { normalizeFileName } from './sanitizeFilename'

export const convertElementToPng = async (
  elementId,
  name,
  scale = 1,
  embedFonts = false,
  download = true,
  useImageCache = false
) => {
  const element = document.getElementById(elementId)
  if (!element) return

  const imgElements = useImageCache ? Array.from(element.querySelectorAll('img')) : []
  const originalSrcs = new Map()
  const imgCache = new Map()

  try {
    if (useImageCache && imgElements.length > 0) {
      // 1. Pre-fetch and convert all images to base64 JPEG
      const uniqueSrcs = [...new Set(imgElements.map((img) => img.src))]
      await Promise.all(
        uniqueSrcs.map(
          (src) =>
            new Promise((resolve) => {
              const img = new Image()
              img.crossOrigin = 'anonymous'
              img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext('2d')

                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, canvas.width, canvas.height)

                ctx.drawImage(img, 0, 0)
                imgCache.set(src, canvas.toDataURL('image/jpeg', 0.6))
                resolve()
              }
              img.onerror = resolve
              img.src = src
            })
        )
      )

      // 2. Temporarily replace img src in the DOM with the base64 versions
      imgElements.forEach((img) => {
        const cachedSrc = imgCache.get(img.src)
        if (cachedSrc) {
          originalSrcs.set(img, img.src)
          img.src = cachedSrc
        }
      })
    }

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
  } finally {
    imgCache.clear()
  }
}
