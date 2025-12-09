import { jsPDF } from 'jspdf'
import { snapdom } from '@zumer/snapdom'
import { formatEffectToHtml } from './cardEffectFormatter'
import { sortDeckCards } from './deckSort.js'
import { normalizeFileName } from './sanitizeFilename'

const PAGE_OPTS = { w: 595, h: 842, cardW: 178.58, cardH: 249.45, gap: 2.83, cols: 3, rows: 3 }
const PRINT_CSS = `
  #pdf-render-content { position: fixed; top: 0; left: -9999px; width: ${PAGE_OPTS.w}pt; height: ${PAGE_OPTS.h}pt; background: #fff; }
  .pdf-card { position: absolute; width: ${PAGE_OPTS.cardW}pt; height: ${PAGE_OPTS.cardH}pt; overflow: hidden; font-family: system-ui, sans-serif; font-size: 7pt; }
  .pdf-overlay { position: absolute; left: 3%; right: 3%; background: rgba(255,255,255,0.85); padding: 2.5%; border-radius: 1.5mm; box-sizing: border-box; color: #000; }
  .pdf-overlay img { height: 0.9em; vertical-align: -0.15em; display: inline-block; }
`

// 生成單張卡片 HTML
const getCardHtml = (card, x, y, lang) => {
  const bottom = card.type === '事件卡' ? '9.51%' : '12.02%'
  let effectHtml = ''

  if (card.type !== '高潮卡' && lang === 'zh') {
    const html = formatEffectToHtml(card.effect).replace(/\.svg/g, '.webp')
    effectHtml = `<div class="pdf-overlay" style="bottom: ${bottom}"><div style="font-size:0.9em; line-height:1.2; text-align:justify; word-break:break-word;">${html}</div></div>`
  }

  return `<div class="pdf-card" style="left:${x}pt; top:${y}pt"><img src="${card.imgUrl}" crossorigin="anonymous" style="width:100%; height:100%; object-fit:cover;">${effectHtml}</div>`
}

export const convertDeckToPDF = async (cards, name, language) => {
  const flatCards = sortDeckCards(cards)
    .flatMap((c) => Array(c.quantity || 1).fill(c))
    .filter((c) => c.imgUrl)
  if (flatCards.length === 0) return

  await Promise.all(
    [...new Set(flatCards.map((c) => c.imgUrl))].map(
      (src) =>
        new Promise((r) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = src
          img.onload = img.onerror = r
        })
    )
  )

  // 容器與樣式
  const style = document.createElement('style')
  style.innerHTML = PRINT_CSS
  document.head.appendChild(style)
  const container = document.createElement('div')
  container.id = 'pdf-render-content'
  document.body.appendChild(container)

  try {
    const pdf = new jsPDF('p', 'pt', 'a4')
    const cardsPerPage = PAGE_OPTS.cols * PAGE_OPTS.rows
    const totalPages = Math.ceil(flatCards.length / cardsPerPage)

    const startX =
      (PAGE_OPTS.w - (PAGE_OPTS.cols * PAGE_OPTS.cardW + (PAGE_OPTS.cols - 1) * PAGE_OPTS.gap)) / 2
    const startY =
      (PAGE_OPTS.h - (PAGE_OPTS.rows * PAGE_OPTS.cardH + (PAGE_OPTS.rows - 1) * PAGE_OPTS.gap)) / 2

    for (let i = 0; i < totalPages; i++) {
      const pageCards = flatCards.slice(i * cardsPerPage, (i + 1) * cardsPerPage)

      container.innerHTML = pageCards
        .map((card, idx) => {
          const col = idx % PAGE_OPTS.cols,
            row = Math.floor(idx / PAGE_OPTS.cols)
          return getCardHtml(
            card,
            startX + col * (PAGE_OPTS.cardW + PAGE_OPTS.gap),
            startY + row * (PAGE_OPTS.cardH + PAGE_OPTS.gap),
            language
          )
        })
        .join('')

      await new Promise((r) => setTimeout(r, 100))
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

      const imgData = await snapdom.toJpg(container, {
        width: PAGE_OPTS.w,
        height: PAGE_OPTS.h,
        dpr: window.devicePixelRatio,
        quality: 0.6,
        scale: 2,
      })
      if (i > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPG', 0, 0, PAGE_OPTS.w, PAGE_OPTS.h)
    }

    const deckName = normalizeFileName(name)
    pdf.save(`${deckName || 'deck'}_${language}.pdf`)
  } catch (e) {
    console.error(e)
  } finally {
    container.remove()
    style.remove()
  }
}
