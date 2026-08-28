import { expose } from 'comlink'

/**
 * 卡組大圖背景渲染 Worker (基於 Comlink RPC)
 * 使用 OffscreenCanvas 在獨立線程中繪製並壓縮圖片，徹底釋放主 UI 線程
 */

/**
 * 將文本限制在指定最大寬度內，超出部分添加省略號 (...)
 * @param {OffscreenCanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string}
 */
const truncateText = (ctx, text, maxWidth) => {
  if (!text) return ''
  if (ctx.measureText(text).width <= maxWidth) return text

  const ellipsis = '...'
  const ellipsisWidth = ctx.measureText(ellipsis).width
  let low = 0
  let high = text.length

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2)
    const sub = text.slice(0, mid)
    if (ctx.measureText(sub).width + ellipsisWidth <= maxWidth) {
      low = mid
    } else {
      high = mid - 1
    }
  }

  return text.slice(0, low) + ellipsis
}

const deckCanvasRenderer = {
  async render({
    targetCards,
    cardBitmaps,
    placeholderBitmap,
    logoBitmap,
    qrBitmap,
    deckName,
    deckKey,
    mode,
    scale = 2,
  }) {
    try {
      const cardImageMap = new Map()
      if (Array.isArray(cardBitmaps)) {
        for (const item of cardBitmaps) {
          if (item?.id && item?.bitmap) {
            cardImageMap.set(item.id, item.bitmap)
          }
        }
      }

      let canvas = null
      let ctx = null

      if (mode === 'tts') {
        // ----------------------------------------------------
        // TTS 模式: 2000px x 1397.5px, 10 列網格，無 padding，背景透明
        // ----------------------------------------------------
        const baseW = 2000
        const baseH = 1397.5
        const cols = 10
        const cardW = baseW / cols // 200px
        const cardH = cardW * (559 / 400) // 279.5px

        canvas = new OffscreenCanvas(Math.round(baseW * scale), Math.round(baseH * scale))
        ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: true })
        if (!ctx) throw new Error('無法建立 OffscreenCanvas 2D 上下文')

        ctx.scale(scale, scale)
        ctx.clearRect(0, 0, baseW, baseH)

        targetCards.forEach((card, index) => {
          const col = index % cols
          const row = Math.floor(index / cols)
          const x = col * cardW
          const y = row * cardH

          const img = cardImageMap.get(card.id) || placeholderBitmap
          if (img) {
            ctx.drawImage(img, x, y, cardW, cardH)
          } else {
            ctx.fillStyle = '#e0e0e0'
            ctx.fillRect(x, y, cardW, cardH)
          }
        })
      } else {
        // ----------------------------------------------------
        // U CLIMAX 模式: 1024px 寬，8 列網格，含 Logo/標題/二維碼/角標
        // ----------------------------------------------------
        const baseW = 1024
        const padding = 16
        const contentW = baseW - padding * 2 // 992px
        const cols = 8
        const colGap = 12
        const rowGap = 24
        const cardW = (contentW - (cols - 1) * colGap) / cols // 113.5px
        const cardH = cardW * (559 / 400) // 158.61625px

        const logoW = 200
        const logoH =
          logoBitmap && logoBitmap.width > 0
            ? logoBitmap.height * (logoW / logoBitmap.width)
            : 53.04

        const leftSectionGap = 20
        const textLineH = 20
        const leftSectionH = logoH + leftSectionGap + textLineH

        const qrSize = 80
        const hasQr = Boolean(qrBitmap)
        const headerH = hasQr ? Math.max(leftSectionH, qrSize) : leftSectionH
        const gridTopGap = 10

        const rows = targetCards.length > 0 ? Math.ceil(targetCards.length / cols) : 1
        const gridH = rows * cardH + (rows - 1) * rowGap
        const totalContentH = headerH + gridTopGap + gridH
        const baseH = padding * 2 + totalContentH

        canvas = new OffscreenCanvas(Math.round(baseW * scale), Math.round(baseH * scale))
        // U_CLIMAX 模式底色為純白，關閉 Alpha 通道
        ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: false })
        if (!ctx) throw new Error('無法建立 OffscreenCanvas 2D 上下文')

        ctx.scale(scale, scale)

        // 填充純白底色
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, baseW, baseH)

        // A. 繪製頭部
        const headerY = padding
        const leftSectionY = headerY + (headerH - leftSectionH) / 2

        // 1. Logo
        if (logoBitmap) {
          ctx.drawImage(logoBitmap, padding, leftSectionY, logoW, logoH)
        }

        // 2. 二維碼
        const qrX = baseW - padding - qrSize
        const qrY = headerY + (headerH - qrSize) / 2
        if (qrBitmap) {
          ctx.save()
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(qrBitmap, qrX, qrY, qrSize, qrSize)
          ctx.restore()
        }

        // 3. 頭部資訊文字 (卡組名稱、卡組代碼)
        const textY = leftSectionY + logoH + leftSectionGap
        const fontStack =
          "'Microsoft JhengHei', 'PingFang TC', 'Heiti TC', 'Noto Sans TC', 'Noto Sans CJK TC', sans-serif"

        const maxTextWidth = (hasQr ? qrX - 24 : baseW - padding) - padding
        let currentX = padding

        // "卡組名稱"
        ctx.font = `bold 16px ${fontStack}`
        ctx.fillStyle = '#000000'
        ctx.textBaseline = 'top'
        const label1 = '卡组名称'
        ctx.fillText(label1, currentX, textY)
        currentX += ctx.measureText(label1).width + 6

        // "卡組代碼" 與代碼值佔用寬度預留
        ctx.font = `bold 16px ${fontStack}`
        const label2 = '卡组代码'
        const label2Width = ctx.measureText(label2).width

        ctx.font = `16px ${fontStack}`
        const codeVal = deckKey || ''
        const codeValWidth = ctx.measureText(codeVal).width

        const rightMetaWidth = 16 + label2Width + 6 + codeValWidth
        const availableNameWidth = Math.max(
          60,
          maxTextWidth - (currentX - padding) - rightMetaWidth - 24
        )

        // deckName (帶省略號自適應截斷)
        ctx.font = `16px ${fontStack}`
        ctx.fillStyle = '#000000'
        const truncatedDeckName = truncateText(ctx, deckName || '', availableNameWidth)
        ctx.fillText(truncatedDeckName, currentX, textY)
        currentX += ctx.measureText(truncatedDeckName).width + 16

        // "卡組代碼"
        ctx.font = `bold 16px ${fontStack}`
        ctx.fillStyle = '#000000'
        ctx.fillText(label2, currentX, textY)
        currentX += label2Width + 6

        // deckKey 值
        ctx.font = `16px ${fontStack}`
        ctx.fillStyle = '#000000'
        ctx.fillText(codeVal, currentX, textY)

        // B. 繪製卡牌網格
        const gridStartY = headerY + headerH + gridTopGap

        targetCards.forEach((card, index) => {
          const col = index % cols
          const row = Math.floor(index / cols)
          const x = padding + col * (cardW + colGap)
          const y = gridStartY + row * (cardH + rowGap)

          // 1. 卡圖 (若失敗回退至 placeholder)
          const img = cardImageMap.get(card.id) || placeholderBitmap
          if (img) {
            ctx.drawImage(img, x, y, cardW, cardH)
          } else {
            ctx.fillStyle = '#e0e0e0'
            ctx.fillRect(x, y, cardW, cardH)
          }

          // 2. 數量角標 (右下角 36x36 圓角 6px)
          const badgeW = 36
          const badgeH = 36
          const badgeMargin = 8
          const badgeX = x + cardW - badgeMargin - badgeW
          const badgeY = y + cardH - badgeMargin - badgeH

          ctx.save()
          ctx.beginPath()
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6)
          } else {
            ctx.rect(badgeX, badgeY, badgeW, badgeH)
          }
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
          ctx.fill()

          // 角標數量文字
          ctx.font = `24px ${fontStack}`
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(card.quantity || 1), badgeX + badgeW / 2, badgeY + badgeH / 2)
          ctx.restore()
        })
      }

      // 統一導出無損 PNG 格式
      const blob = await canvas.convertToBlob({ type: 'image/png' })

      return {
        blob,
        width: canvas.width,
        height: canvas.height,
        format: 'png',
      }
    } finally {
      // 確保在任何情況下（包含異常）均立即釋放 ImageBitmap 顯存
      cardBitmaps?.forEach((item) => item?.bitmap?.close?.())
      placeholderBitmap?.close?.()
      logoBitmap?.close?.()
      qrBitmap?.close?.()
    }
  },
}

expose(deckCanvasRenderer)
