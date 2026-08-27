import { normalizeFileName } from './sanitizeFilename'
import { getMatchedWenkaiFontCss } from './fontEmbedding'

const dataUrlCache = new Map()

export const fetchAsDataUrl = async (src) => {
  if (!src || src.startsWith('data:')) return src
  if (dataUrlCache.has(src)) return dataUrlCache.get(src)

  try {
    const res = await fetch(src)
    if (!res.ok) return src
    const blob = await res.blob()
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(src)
      reader.readAsDataURL(blob)
    })
    dataUrlCache.set(src, dataUrl)
    return dataUrl
  } catch {
    return src
  }
}

const COMMON_EXPORT_CSS = `
  .replay-block { border: 3px solid #4caf50; border-radius: 8px; padding: 4px 7px; margin-top: 4px; display: block; }
  .inline-icon { height: 0.9em; vertical-align: -0.15em; display: inline-block; }
`

/**
 * 将指定 DOM 节点转为 PNG 图片
 * @param {string} elementId - 目标 DOM ID
 * @param {string} name - 导出文件名
 * @param {number} [scale=1] - 缩放倍数
 * @param {boolean} [embedFonts=false] - 是否内联自定义字体
 * @param {boolean} [download=true] - 是否直接下载
 * @returns {Promise<Blob|void>}
 */
export const convertElementToPng = async (
  elementId,
  name,
  scale = 1,
  embedFonts = false,
  download = true
) => {
  console.time('PNG conversion')

  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`[domToImage] Element #${elementId} not found`)
    return
  }

  try {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    const rect = element.getBoundingClientRect()
    const width = Math.ceil(rect.width || 400)
    const height = Math.ceil(rect.height || 557)

    const clone = element.cloneNode(true)
    clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')

    // 重置离屏容器偏移与定位
    clone.style.position = 'relative'
    clone.style.left = '0px'
    clone.style.top = '0px'
    clone.style.margin = '0px'
    clone.style.transform = 'none'

    // 将 <img> 内联为 Base64 避免跨域阻断
    const imgElements = Array.from(clone.querySelectorAll('img'))
    await Promise.all(
      imgElements.map(async (img) => {
        if (img.src && !img.src.startsWith('data:')) {
          const dataUrl = await fetchAsDataUrl(img.src)
          img.setAttribute('src', dataUrl)
        }
      })
    )

    let fontCss = COMMON_EXPORT_CSS
    if (embedFonts) {
      const text = element.textContent || ''
      const wenkaiCss = await getMatchedWenkaiFontCss(text)
      if (wenkaiCss) fontCss += '\n' + wenkaiCss
    }

    const xhtml = new XMLSerializer().serializeToString(clone)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <style>${fontCss}</style>
      <foreignObject width="100%" height="100%">${xhtml}</foreignObject>
    </svg>`

    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('SVG ForeignObject 栅格化失败'))
      img.src = dataUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建 Canvas 2D 上下文')

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    canvas.width = 0
    canvas.height = 0
    if (!blob) throw new Error('Canvas 导出 PNG 失败')

    if (download) {
      const filename = normalizeFileName(name)
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${filename}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } else {
      return blob
    }
  } catch (error) {
    console.error('PNG conversion failed:', error)
    throw error
  } finally {
    console.timeEnd('PNG conversion')
  }
}
