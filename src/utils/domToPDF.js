import { formatEffectToHtml } from './cardEffectFormatter'
import { sortCards } from './cardsSort.js'
import { normalizeFileName } from './sanitizeFilename'
import { getMatchedWenkaiFontCss } from './fontEmbedding'
import { fetchAsDataUrl } from './fetchDataUrl'
import { getOverlayStyle, getOverlayBottom, getIconStyle, styleToCssRule } from './overlayStyle'

const PAGE_OPTS = { w: 595, h: 842, cardW: 178.58, cardH: 249.45, gap: 2.83, cols: 3, rows: 3 }

const PRINT_CSS = [
  `.pdf-card { position: absolute; width: ${PAGE_OPTS.cardW}px; height: ${PAGE_OPTS.cardH}px; overflow: hidden; background: transparent; }`,
  styleToCssRule('.pdf-overlay', getOverlayStyle(PAGE_OPTS.cardW)),
  styleToCssRule('.pdf-overlay img', getIconStyle(PAGE_OPTS.cardW)),
].join('\n')

const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })

// 生成单卡中文效果覆层 HTML
const getCardOverlayHtml = (card, x, y) => {
  if (card.type === '高潮卡' || !card.effect) return ''
  const bottom = getOverlayBottom(PAGE_OPTS.cardW, card.type)
  return `<div class="pdf-card" style="left:${x}px; top:${y}px"><div class="pdf-overlay" style="bottom:${bottom}">${formatEffectToHtml(card.effect, PAGE_OPTS.cardW)}</div></div>`
}

/**
 * 导出卡组为 PDF (Canvas 2D 底图拼版 + SVG 效果覆层)
 */
export const convertDeckToPDF = async (cards, name, language) => {
  console.time('PDF conversion')

  const { Pdf } = await import('documonster/pdf')

  const flatCards = sortCards(cards)
    .flatMap((c) => Array(c.quantity || 1).fill(c))
    .filter((c) => c.imgUrl)
  if (!flatCards.length) return

  // 并行预加载卡图
  const uniqueCardUrls = [...new Set(flatCards.map((c) => c.imgUrl))]
  const cardImageMap = new Map()
  await Promise.all(
    uniqueCardUrls.map(async (src) => {
      const img = await loadImage(src)
      if (img) cardImageMap.set(src, img)
    })
  )

  let canvas = null
  try {
    const doc = new Pdf.Builder()
    const cardsPerPage = PAGE_OPTS.cols * PAGE_OPTS.rows
    const totalPages = Math.ceil(flatCards.length / cardsPerPage)

    const startX =
      (PAGE_OPTS.w - (PAGE_OPTS.cols * PAGE_OPTS.cardW + (PAGE_OPTS.cols - 1) * PAGE_OPTS.gap)) / 2
    const startY =
      (PAGE_OPTS.h - (PAGE_OPTS.rows * PAGE_OPTS.cardH + (PAGE_OPTS.rows - 1) * PAGE_OPTS.gap)) / 2

    const scale = 2
    canvas = document.createElement('canvas')
    canvas.width = Math.round(PAGE_OPTS.w * scale)
    canvas.height = Math.round(PAGE_OPTS.h * scale)
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    if (!ctx) throw new Error('无法创建 Canvas 2D 上下文')

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pageCards = flatCards.slice(pageIdx * cardsPerPage, (pageIdx + 1) * cardsPerPage)

      // 绘制 9 张卡片底图
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(scale, scale)

      pageCards.forEach((card, idx) => {
        const col = idx % PAGE_OPTS.cols
        const row = Math.floor(idx / PAGE_OPTS.cols)
        const x = startX + col * (PAGE_OPTS.cardW + PAGE_OPTS.gap)
        const y = startY + row * (PAGE_OPTS.cardH + PAGE_OPTS.gap)

        const img = cardImageMap.get(card.imgUrl)
        if (img) {
          ctx.drawImage(img, x, y, PAGE_OPTS.cardW, PAGE_OPTS.cardH)
        } else {
          ctx.fillStyle = '#f0f0f0'
          ctx.fillRect(x, y, PAGE_OPTS.cardW, PAGE_OPTS.cardH)
        }
      })

      ctx.restore()

      // 中文模式绘制效果覆层
      if (language === 'zh') {
        const overlaysHtml = pageCards
          .map((card, idx) => {
            const col = idx % PAGE_OPTS.cols
            const row = Math.floor(idx / PAGE_OPTS.cols)
            const x = startX + col * (PAGE_OPTS.cardW + PAGE_OPTS.gap)
            const y = startY + row * (PAGE_OPTS.cardH + PAGE_OPTS.gap)
            return getCardOverlayHtml(card, x, y)
          })
          .join('')

        if (overlaysHtml.trim()) {
          const container = document.createElement('div')
          container.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
          container.style.cssText = `position: relative; width: ${PAGE_OPTS.w}px; height: ${PAGE_OPTS.h}px; margin: 0; padding: 0; background: transparent;`
          container.innerHTML = overlaysHtml

          // 内联覆层中的所有图标为 Base64
          const imgElements = Array.from(container.querySelectorAll('img'))
          await Promise.all(
            imgElements.map(async (img) => {
              if (img.src && !img.src.startsWith('data:')) {
                const dataUrl = await fetchAsDataUrl(img.src)
                img.setAttribute('src', dataUrl)
              }
            })
          )

          const allPageText = pageCards.map((c) => c.effect || '').join(' ')
          const wenkaiFontCss = await getMatchedWenkaiFontCss(allPageText)

          const xhtml = new XMLSerializer().serializeToString(container)
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_OPTS.w}" height="${PAGE_OPTS.h}">
            <style>
              ${PRINT_CSS}
              ${wenkaiFontCss}
            </style>
            <foreignObject width="100%" height="100%">${xhtml}</foreignObject>
          </svg>`

          const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
          const overlayImg = await loadImage(dataUrl)

          if (overlayImg) {
            ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height)
          }
        }
      }

      // 输出当前页至 PDF
      const pageBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
      if (!pageBlob) continue

      const bytes = new Uint8Array(await pageBlob.arrayBuffer())
      const page = doc.addPage({ width: PAGE_OPTS.w, height: PAGE_OPTS.h })
      page.drawImage({
        data: bytes,
        format: 'jpeg',
        x: 0,
        y: 0,
        width: PAGE_OPTS.w,
        height: PAGE_OPTS.h,
      })
    }

    const pdfBytes = await doc.build()
    const deckName = normalizeFileName(name)
    const pdfUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }))

    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `${deckName || 'deck'}_${language}.pdf`
    link.click()
    URL.revokeObjectURL(pdfUrl)
  } catch (error) {
    console.error('PDF conversion failed:', error)
    throw error
  } finally {
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
    cardImageMap.clear()
    console.timeEnd('PDF conversion')
  }
}
