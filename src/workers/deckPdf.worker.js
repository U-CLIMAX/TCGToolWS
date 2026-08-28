import { expose, transfer } from 'comlink'
import { Pdf } from 'documonster/pdf'

/**
 * 卡組 PDF 背景拼版與生成 Worker (基於 Comlink RPC)
 * 將多頁 A4 畫布排版、OffscreenCanvas 繪製、JPEG 壓縮與 PDF 組裝完全移出主線程
 */

const deckPdfWorker = {
  async buildPdf({
    flatCards,
    cardBitmaps,
    overlayBitmaps = [],
    pageOpts,
    totalPages,
    cardsPerPage,
    scale = 2,
  }) {
    try {
      const cardBitmapMap = new Map()
      if (Array.isArray(cardBitmaps)) {
        for (const item of cardBitmaps) {
          if (item?.url && item?.bitmap) {
            cardBitmapMap.set(item.url, item.bitmap)
          }
        }
      }

      const overlayBitmapMap = new Map()
      if (Array.isArray(overlayBitmaps)) {
        for (const item of overlayBitmaps) {
          if (item?.pageIdx !== undefined && item?.bitmap) {
            overlayBitmapMap.set(item.pageIdx, item.bitmap)
          }
        }
      }

      const doc = new Pdf.Builder()
      const canvasW = Math.round(pageOpts.w * scale)
      const canvasH = Math.round(pageOpts.h * scale)
      const canvas = new OffscreenCanvas(canvasW, canvasH)
      // A4 紙張純白底色，關閉 Alpha 通道
      const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: false })
      if (!ctx) throw new Error('無法建立 OffscreenCanvas 2D 上下文')

      const startX =
        (pageOpts.w - (pageOpts.cols * pageOpts.cardW + (pageOpts.cols - 1) * pageOpts.gap)) / 2
      const startY =
        (pageOpts.h - (pageOpts.rows * pageOpts.cardH + (pageOpts.rows - 1) * pageOpts.gap)) / 2

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const pageCards = flatCards.slice(pageIdx * cardsPerPage, (pageIdx + 1) * cardsPerPage)

        // 1. 繪製 9 張卡片底圖
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvasW, canvasH)
        ctx.scale(scale, scale)

        pageCards.forEach((card, idx) => {
          const col = idx % pageOpts.cols
          const row = Math.floor(idx / pageOpts.cols)
          const x = startX + col * (pageOpts.cardW + pageOpts.gap)
          const y = startY + row * (pageOpts.cardH + pageOpts.gap)

          const bitmap = cardBitmapMap.get(card.imgUrl)
          if (bitmap) {
            ctx.drawImage(bitmap, x, y, pageOpts.cardW, pageOpts.cardH)
          } else {
            ctx.fillStyle = '#f0f0f0'
            ctx.fillRect(x, y, pageOpts.cardW, pageOpts.cardH)
          }
        })

        ctx.restore()

        // 2. 繪製效果覆層 (若有)
        const overlay = overlayBitmapMap.get(pageIdx)
        if (overlay) {
          ctx.drawImage(overlay, 0, 0, canvasW, canvasH)
        }

        // 3. 背景非同步壓縮單頁 JPEG
        const pageBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
        if (!pageBlob) continue

        const bytes = new Uint8Array(await pageBlob.arrayBuffer())
        const page = doc.addPage({ width: pageOpts.w, height: pageOpts.h })
        page.drawImage({
          data: bytes,
          format: 'jpeg',
          x: 0,
          y: 0,
          width: pageOpts.w,
          height: pageOpts.h,
        })
      }

      // 4. 背景編譯 PDF 二進位流
      const pdfBytes = await doc.build()

      // 透過 transfer 將 ArrayBuffer 零拷貝移交回主線程
      return transfer(pdfBytes, [pdfBytes.buffer])
    } finally {
      // 確保在任何情況下均釋放所有 ImageBitmap 顯存
      cardBitmaps?.forEach((item) => item?.bitmap?.close?.())
      overlayBitmaps?.forEach((item) => item?.bitmap?.close?.())
    }
  },
}

expose(deckPdfWorker)
