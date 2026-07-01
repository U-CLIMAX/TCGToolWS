import { Pdf } from 'documonster/pdf'
import { snapdom } from '@zumer/snapdom'
import { formatEffectToHtml } from './cardEffectFormatter'
import { sortCards } from './cardsSort.js'
import { normalizeFileName } from './sanitizeFilename'

const PAGE_OPTS = { w: 595, h: 842, cardW: 178.58, cardH: 249.45, gap: 2.83, cols: 3, rows: 3 }
const PRINT_CSS = `
  #pdf-render-content { position: fixed; top: 0; left: -9999px; width: ${PAGE_OPTS.w}pt; height: ${PAGE_OPTS.h}pt; background: #fff; }
  .pdf-card { position: absolute; width: ${PAGE_OPTS.cardW}pt; height: ${PAGE_OPTS.cardH}pt; overflow: hidden; font-family: system-ui, sans-serif; font-size: 7pt; }
  .pdf-overlay { position: absolute; left: 3%; right: 3%; background: rgba(255,255,255,0.85); padding: 2.5%; border-radius: 1.5mm; box-sizing: border-box; color: #000; }
  .pdf-overlay img { height: 0.9em; vertical-align: -0.15em; display: inline-block; }
`

const getCardHtml = (card, x, y, lang, imgCache) => {
  const cachedSrc = imgCache.get(card.imgUrl) || card.imgUrl
  const bottom = card.type === '事件卡' ? '9.51%' : '12.02%'
  let effectHtml = ''

  if (card.type !== '高潮卡' && lang === 'zh') {
    const html = formatEffectToHtml(card.effect).replace(/\.svg/g, '.webp')
    effectHtml = `<div class="pdf-overlay" style="bottom: ${bottom}"><div style="font-size:0.9em; line-height:1.2; text-align:justify; word-break:break-word;">${html}</div></div>`
  }

  return `<div class="pdf-card" style="left:${x}pt; top:${y}pt"><img src="${cachedSrc}" crossorigin="anonymous" style="width:100%; height:100%; object-fit:cover;">${effectHtml}</div>`
}

export const convertDeckToPDF = async (cards, name, language) => {
  console.time('PDF conversion')
  const flatCards = sortCards(cards)
    .flatMap((c) => Array(c.quantity || 1).fill(c))
    .filter((c) => c.imgUrl)
  if (!flatCards.length) return

  const imgCache = new Map()
  await Promise.all(
    [...new Set(flatCards.map((c) => c.imgUrl))].map(
      (src) =>
        new Promise((r) => {
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
            imgCache.set(src, canvas.toDataURL('image/jpeg', 0.8))
            r()
          }
          img.onerror = r
          img.src = src
        })
    )
  )

  const style = document.createElement('style')
  style.innerHTML = PRINT_CSS
  document.head.appendChild(style)
  const container = document.createElement('div')
  container.id = 'pdf-render-content'
  document.body.appendChild(container)

  try {
    const doc = new Pdf.Builder()
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
          const col = idx % PAGE_OPTS.cols
          const row = Math.floor(idx / PAGE_OPTS.cols)
          return getCardHtml(
            card,
            startX + col * (PAGE_OPTS.cardW + PAGE_OPTS.gap),
            startY + row * (PAGE_OPTS.cardH + PAGE_OPTS.gap),
            language,
            imgCache
          )
        })
        .join('')

      await new Promise((r) => setTimeout(r, 100))
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

      const blob = await snapdom.toBlob(container, {
        type: 'jpeg',
        width: PAGE_OPTS.w,
        height: PAGE_OPTS.h,
        dpr: 1,
        quality: 0.6,
        scale: 2,
      })
      const arrayBuffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

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
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${deckName || 'deck'}_${language}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('PDF conversion failed:', e)
  } finally {
    container.remove()
    style.remove()
    imgCache.clear()
    console.timeEnd('PDF conversion')
  }
}
