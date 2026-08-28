import { formatEffectToHtml } from './cardEffectFormatter'
import { sortCards } from './cardsSort.js'
import { normalizeFileName } from './sanitizeFilename'
import { getMatchedWenkaiFontCss } from './fontEmbedding'
import { inlineDomImages } from './imageInliner'
import { getOverlayStyle, getOverlayBottom, getIconStyle, styleToCssRule } from './overlayStyle'
import { batchLoadImages, loadImageWithDecode } from './cardImageLoader.js'
import { wrap, transfer } from 'comlink'
import DeckPdfWorker from '@/workers/deckPdf.worker.js?worker'

const PAGE_OPTS = { w: 595, h: 842, cardW: 178.58, cardH: 249.45, gap: 2.83, cols: 3, rows: 3 }

const PRINT_CSS = [
  `.pdf-card { position: absolute; width: ${PAGE_OPTS.cardW}px; height: ${PAGE_OPTS.cardH}px; overflow: hidden; background: transparent; }`,
  styleToCssRule('.pdf-overlay', getOverlayStyle(PAGE_OPTS.cardW)),
  styleToCssRule('.pdf-overlay img, .pdf-overlay svg', getIconStyle(PAGE_OPTS.cardW)),
].join('\n')

// 生成單卡中文效果覆層 HTML
const getCardOverlayHtml = (card, x, y) => {
  if (card.type === '高潮卡' || !card.effect) return ''
  const bottom = getOverlayBottom(PAGE_OPTS.cardW, card.type)
  return `<div class="pdf-card" style="left:${x}px; top:${y}px"><div class="pdf-overlay" style="bottom:${bottom}">${formatEffectToHtml(card.effect, PAGE_OPTS.cardW)}</div></div>`
}

/**
 * 導出卡組為 PDF (透過 Web Worker + OffscreenCanvas 進行拼版與二進位構建)
 *
 * @param {Array} cards - 卡牌清單
 * @param {string} name - 卡組檔名
 * @param {'zh'|'jp'} language - 語言模式 ('zh' 需中文覆層)
 */
export const convertDeckToPDF = async (cards, name, language) => {
  console.time('PDF conversion')

  const flatCards = sortCards(cards)
    .flatMap((c) => Array(c.quantity || 1).fill(c))
    .filter((c) => c.imgUrl)
  if (!flatCards.length) return

  const uniqueCardUrls = [...new Set(flatCards.map((c) => c.imgUrl))]
  const cardImageMap = await batchLoadImages(uniqueCardUrls, 6)

  const cardsPerPage = PAGE_OPTS.cols * PAGE_OPTS.rows
  const totalPages = Math.ceil(flatCards.length / cardsPerPage)

  const startX =
    (PAGE_OPTS.w - (PAGE_OPTS.cols * PAGE_OPTS.cardW + (PAGE_OPTS.cols - 1) * PAGE_OPTS.gap)) / 2
  const startY =
    (PAGE_OPTS.h - (PAGE_OPTS.rows * PAGE_OPTS.cardH + (PAGE_OPTS.rows - 1) * PAGE_OPTS.gap)) / 2

  const scale = 2

  try {
    // 預先載入卡圖並轉為 ImageBitmap
    const cardBitmaps = await Promise.all(
      uniqueCardUrls.map(async (url) => {
        const img = cardImageMap.get(url)
        if (!img) return null
        try {
          const bitmap = await createImageBitmap(img)
          return { url, bitmap }
        } catch {
          return null
        }
      })
    )

    // 中文模式在主線程預先將 SVG 效果覆層以目標尺寸 (1190x1684) 向量光柵化為 ImageBitmap
    const overlayBitmaps = []
    if (language === 'zh') {
      const allDeckText = flatCards.map((c) => c.effect || '').join(' ')
      const wenkaiFontCss = await getMatchedWenkaiFontCss(allDeckText)

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const pageCards = flatCards.slice(pageIdx * cardsPerPage, (pageIdx + 1) * cardsPerPage)
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

          await inlineDomImages(container)

          const xhtml = new XMLSerializer().serializeToString(container)
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_OPTS.w}" height="${PAGE_OPTS.h}">
            <style>
              ${PRINT_CSS}
              ${wenkaiFontCss}
            </style>
            <foreignObject width="100%" height="100%">${xhtml}</foreignObject>
          </svg>`

          const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
          const overlayImg = await loadImageWithDecode(dataUrl)
          if (overlayImg) {
            const targetW = Math.round(PAGE_OPTS.w * scale)
            const targetH = Math.round(PAGE_OPTS.h * scale)
            const overlayCanvas = new OffscreenCanvas(targetW, targetH)
            const octx = overlayCanvas.getContext('2d')
            octx.drawImage(overlayImg, 0, 0, targetW, targetH)
            const bitmap = overlayCanvas.transferToImageBitmap()

            overlayBitmaps.push({ pageIdx, bitmap })
            overlayImg.src = ''
          }
        }
      }
    }

    const transferList = []
    for (const item of cardBitmaps) {
      if (item?.bitmap) transferList.push(item.bitmap)
    }
    for (const item of overlayBitmaps) {
      if (item?.bitmap) transferList.push(item.bitmap)
    }

    const worker = new DeckPdfWorker()
    const api = wrap(worker)

    let pdfBytes
    try {
      pdfBytes = await api.buildPdf(
        transfer(
          {
            flatCards: flatCards.map((c) => ({ imgUrl: c.imgUrl })),
            cardBitmaps,
            overlayBitmaps,
            pageOpts: PAGE_OPTS,
            totalPages,
            cardsPerPage,
            scale,
          },
          transferList
        )
      )
    } finally {
      worker.terminate()
    }

    const deckName = normalizeFileName(name)
    const pdfUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }))

    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `${deckName || 'deck'}_${language}.pdf`
    link.click()
    URL.revokeObjectURL(pdfUrl)
  } catch (error) {
    console.error('PDF generation failed:', error)
    throw error
  } finally {
    cardImageMap.clear()
    console.timeEnd('PDF conversion')
  }
}
