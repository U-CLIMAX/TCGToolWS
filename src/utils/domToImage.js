import { normalizeFileName } from './sanitizeFilename'
import { getMatchedWenkaiFontCss } from './fontEmbedding'
import { inlineDomImages } from './imageInliner'
import { wrap, transfer } from 'comlink'
import DomToImageWorker from '@/workers/domToImage.worker.js?worker'

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

    // 将 <img> 内联化处理（SVG 转原生矢量节点，位图转 Base64）
    await inlineDomImages(clone)

    let fontCss = ''
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

    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const offscreen = new OffscreenCanvas(targetW, targetH)
    const octx = offscreen.getContext('2d')
    if (!octx) throw new Error('无法创建 OffscreenCanvas 2D 上下文')

    octx.drawImage(img, 0, 0, targetW, targetH)
    const bitmap = offscreen.transferToImageBitmap()

    const worker = new DomToImageWorker()
    const api = wrap(worker)
    let blob
    try {
      blob = await api.renderToBlob(
        transfer(
          {
            bitmap,
            width: targetW,
            height: targetH,
          },
          [bitmap]
        )
      )
    } finally {
      worker.terminate()
    }

    if (!blob) throw new Error('Worker 导出 PNG 失败')

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
