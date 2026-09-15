import { normalizeFileName } from './sanitizeFilename'
import { getMatchedWenkaiFontCss } from './fontEmbedding'
import { inlineDomImages } from './imageInliner'
import { loadImageWithDecode } from './cardImageLoader'
import { getOverlayStyle, getIconStyle } from './overlayStyle'

/** 基准单卡尺寸 (px) */
const BASE_CARD_WIDTH = 400
const BASE_CARD_HEIGHT = 557

/**
 * 将 SVG 字符串快速光栅化为 HTMLImageElement
 * @param {string} svgString - SVG XML 字符串
 * @returns {Promise<HTMLImageElement>}
 */
const loadSvgImage = (svgString) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('SVG 光栅化失败'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
  })
}

/**
 * 触发 Blob 文件下载
 * @param {Blob} blob - 待下载的 Blob 数据
 * @param {string} filename - 保存的文件名 (不含扩展名)
 */
export const triggerDownloadBlob = (blob, filename) => {
  const safeName = normalizeFileName(filename)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeName}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 将原卡图直接转换为 PNG 格式 Blob (零 DOM 开销)
 * @param {string} imageUrl - 原卡图 URL
 * @returns {Promise<Blob>}
 */
export const renderCardOriginalToBlob = async (imageUrl) => {
  if (!imageUrl) throw new Error('卡片图片链接无效')

  const bitmap = await loadImageWithDecode(imageUrl)
  if (!bitmap) throw new Error('无法解码卡片原图')

  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 Canvas 2D 上下文')

  ctx.drawImage(bitmap, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas 导出 Blob 失败'))
    }, 'image/png')
  })
}

/**
 * 极速双层 Canvas 合成：卡牌底图 + 效果文字覆层 (彻底解决 Safari 黑图与性能问题)
 * @param {Object} options
 * @param {string} options.imageUrl - 卡牌原图 URL
 * @param {string} options.effectHtml - 格式化后的效果 HTML 字符串
 * @param {string} [options.cardType] - 卡片类型 (决定覆层 bottom 定位)
 * @param {number} [options.scale=2] - 渲染倍率 (默认 2x = 800x1114)
 * @returns {Promise<Blob>}
 */
export const renderCardWithTextToBlob = async ({ imageUrl, effectHtml, cardType, scale = 2 }) => {
  const targetW = Math.round(BASE_CARD_WIDTH * scale)
  const targetH = Math.round(BASE_CARD_HEIGHT * scale)

  // 1. 并发加载：底层图片解码 (LRU / ImageBitmap) 与 文楷字体 CSS 提取
  const plainText = (effectHtml || '').replace(/<[^>]+>/g, '')
  const [cardBitmap, fontCss] = await Promise.all([
    loadImageWithDecode(imageUrl),
    getMatchedWenkaiFontCss(plainText),
  ])

  if (!cardBitmap) throw new Error('无法加载卡片原图')

  // 2. 内存中构建纯文字覆层 DOM，并将图标内联为矢量 <svg>
  const overlayDiv = document.createElement('div')
  Object.assign(overlayDiv.style, getOverlayStyle(BASE_CARD_WIDTH, cardType))
  overlayDiv.innerHTML = effectHtml || ''

  await inlineDomImages(overlayDiv)

  const iconStyle = getIconStyle(BASE_CARD_WIDTH)
  overlayDiv.querySelectorAll('svg, img').forEach((el) => {
    Object.assign(el.style, iconStyle)
  })

  const serializedOverlay = new XMLSerializer().serializeToString(overlayDiv)

  // 3. 构建仅含文字与向量图标的轻量 SVG (无 <img> 标签，100% 免疫 Safari 沙箱阻断)
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${BASE_CARD_WIDTH}" height="${BASE_CARD_HEIGHT}">
    <style>
      ${fontCss || ''}
    </style>
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="position: relative; width: ${BASE_CARD_WIDTH}px; height: ${BASE_CARD_HEIGHT}px; overflow: hidden;">
        ${serializedOverlay}
      </div>
    </foreignObject>
  </svg>`

  const overlayImg = await loadSvgImage(svgContent)

  // 4. 2D Canvas 双层直接绘制合成
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 Canvas 2D 上下文')

  // 底层：卡图
  ctx.drawImage(cardBitmap, 0, 0, targetW, targetH)
  // 顶层：效果文字覆层
  ctx.drawImage(overlayImg, 0, 0, targetW, targetH)

  // 5. 导出 PNG Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas 导出 Blob 失败'))
    }, 'image/png')
  })
}

/**
 * 纯效果文本图片导出 (支持自定义尺寸、颜色与排版)
 * @param {Object} options
 * @param {string} options.effectHtml - 格式化后的效果 HTML 字符串
 * @param {number} [options.width=400] - 文本容器宽度
 * @param {number} [options.fontSize=16] - 字体大小
 * @param {number} [options.lineHeight=24] - 行高
 * @param {string} [options.bgColor='#ffffff'] - 背景颜色
 * @param {string} [options.textColor='#000000'] - 文字颜色
 * @param {number} [options.borderRadius=8] - 圆角弧度
 * @param {number} [options.padding=20] - 内边距
 * @returns {Promise<Blob>}
 */
export const renderTextToBlob = async ({
  effectHtml,
  width = 400,
  fontSize = 16,
  lineHeight = 24,
  bgColor = '#ffffff',
  textColor = '#000000',
  borderRadius = 8,
  padding = 20,
}) => {
  const plainText = (effectHtml || '').replace(/<[^>]+>/g, '')
  const fontCss = await getMatchedWenkaiFontCss(plainText)

  const container = document.createElement('div')
  Object.assign(container.style, {
    width: `${width}px`,
    backgroundColor: bgColor,
    borderRadius: `${borderRadius}px`,
    padding: `${padding}px`,
    boxSizing: 'border-box',
    fontFamily: "'LXGW WenKai Lite', system-ui, sans-serif",
    color: textColor,
    fontSize: `${fontSize}px`,
    lineHeight: `${lineHeight}px`,
    wordBreak: 'break-word',
    textAlign: 'justify',
  })
  container.innerHTML = effectHtml || ''

  await inlineDomImages(container)

  container.querySelectorAll('svg, img').forEach((icon) => {
    Object.assign(icon.style, {
      height: `${fontSize}px`,
      width: 'auto',
      verticalAlign: '-0.15em',
      display: 'inline-block',
    })
  })

  // 临时测量高度
  Object.assign(container.style, {
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
  })
  document.body.appendChild(container)
  const measuredHeight = Math.ceil(container.scrollHeight || container.offsetHeight || 300)
  document.body.removeChild(container)

  Object.assign(container.style, {
    position: 'static',
    left: '0',
    top: '0',
  })

  const serialized = new XMLSerializer().serializeToString(container)
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${measuredHeight}">
    <style>
      ${fontCss || ''}
    </style>
    <foreignObject width="100%" height="100%">
      ${serialized}
    </foreignObject>
  </svg>`

  const img = await loadSvgImage(svgContent)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = measuredHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 Canvas 2D 上下文')

  ctx.drawImage(img, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas 导出 Blob 失败'))
    }, 'image/png')
  })
}
