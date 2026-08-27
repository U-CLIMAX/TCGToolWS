import { sortCards } from '@/utils/cardsSort.js'
import { getCardUrls } from '@/utils/getCardImage'
import { generate } from 'lean-qr'
import logoUrl from '@/assets/ui/logo.webp'

/**
 * 异步加载单张图片为 HTMLImageElement，支持跨域
 * 若加载失败直接返回 null
 * @param {string} src
 * @returns {Promise<HTMLImageElement|null>}
 */
const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })

const loadCardImage = async (card, placeholderImg) => {
  const url = card.imgUrl || getCardUrls(card.cardIdPrefix, card.id)?.base
  return (url && (await loadImage(url))) || placeholderImg
}

/**
 * 将文本限制在指定最大宽度内，超出部分添加省略号 (...)
 * @param {CanvasRenderingContext2D} ctx
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

/**
 * 基于 Canvas 2D 渲染卡组大图 (U-CLIMAX 与 TTS 两种模式)
 *
 * @param {Object} options
 * @param {Object|Array} options.cards - 卡牌数据
 * @param {string} options.deckName - 卡组名称
 * @param {string} options.deckKey - 卡组代码
 * @param {'u_climax'|'tts'} [options.mode='u_climax'] - 导出模式
 * @param {boolean} [options.includeQrCode=true] - 是否生成二维码
 * @param {number} [options.scale=2] - 输出缩放倍数
 * @returns {Promise<{ src: string, width: number, height: number, blob: Blob }>}
 */
export const renderDeckToCanvas = async ({
  cards,
  deckName = '',
  deckKey = '',
  mode = 'u_climax',
  includeQrCode = true,
  scale = 2,
}) => {
  // 1. 等待所有已定义的 Web 字体就绪，确保 Canvas 绘制时获得 100% 精确字形
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      // 字体就绪探测失败时不阻塞主流程
    }
  }

  // 2. 格式化卡牌列表并排序
  const rawCards = cards ? (Array.isArray(cards) ? cards : Object.values(cards)) : []
  const sortedCards = sortCards(rawCards)

  // 3. 根据模式分别构建卡牌清单
  const targetCards =
    mode === 'tts'
      ? sortedCards.flatMap((card) => Array(Number(card.quantity) || 1).fill(card))
      : sortedCards

  // 4. 并行预加载占位图、所有卡图与 Logo
  const placeholderImg = await loadImage('/placehold.webp')
  const uniqueCards = Array.from(new Map(targetCards.map((c) => [c.id, c])).values())
  const cardImageMap = new Map()

  await Promise.all(
    uniqueCards.map(async (card) => {
      const img = await loadCardImage(card, placeholderImg)
      if (img) cardImageMap.set(card.id, img)
    })
  )

  let logoImg = null
  if (mode === 'u_climax') {
    logoImg = await loadImage(logoUrl)
  }

  // 5. 尺寸与网格排版参数计算 (基准 1x 逻辑像素)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: false })
  if (!ctx) throw new Error('无法创建 Canvas 2D 上下文')

  if (mode === 'tts') {
    // ----------------------------------------------------
    // TTS 模式: 2000px x 1397.5px, 10 列网格，无 padding，背景透明
    // ----------------------------------------------------
    const baseW = 2000
    const baseH = 1397.5
    const cols = 10
    const cardW = baseW / cols // 200px
    const cardH = cardW * (559 / 400) // 279.5px

    canvas.width = Math.round(baseW * scale)
    canvas.height = Math.round(baseH * scale)
    ctx.scale(scale, scale)

    // 清空为透明背景
    ctx.clearRect(0, 0, baseW, baseH)

    targetCards.forEach((card, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const x = col * cardW
      const y = row * cardH

      const img = cardImageMap.get(card.id) || placeholderImg
      if (img) {
        ctx.drawImage(img, x, y, cardW, cardH)
      } else {
        ctx.fillStyle = '#e0e0e0'
        ctx.fillRect(x, y, cardW, cardH)
      }
    })
  } else {
    // ----------------------------------------------------
    // U CLIMAX 模式: 1024px 宽，8 列网格，含 Logo/标题/二维码/角标
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
      logoImg && logoImg.naturalWidth > 0
        ? logoImg.naturalHeight * (logoW / logoImg.naturalWidth)
        : 53.04

    const leftSectionGap = 20
    const textLineH = 20
    const leftSectionH = logoH + leftSectionGap + textLineH

    const qrSize = 80
    const hasQr = includeQrCode && Boolean(deckKey)
    const headerH = hasQr ? Math.max(leftSectionH, qrSize) : leftSectionH
    const gridTopGap = 10

    const rows = targetCards.length > 0 ? Math.ceil(targetCards.length / cols) : 1
    const gridH = rows * cardH + (rows - 1) * rowGap
    const totalContentH = headerH + gridTopGap + gridH
    const baseH = padding * 2 + totalContentH

    canvas.width = Math.round(baseW * scale)
    canvas.height = Math.round(baseH * scale)
    ctx.scale(scale, scale)

    // 填充纯白底色
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, baseW, baseH)

    // A. 绘制头部
    const headerY = padding
    const leftSectionY = headerY + (headerH - leftSectionH) / 2

    // 1. Logo
    if (logoImg) {
      ctx.drawImage(logoImg, padding, leftSectionY, logoW, logoH)
    }

    // 2. 二维码
    const qrX = baseW - padding - qrSize
    const qrY = headerY + (headerH - qrSize) / 2
    if (hasQr) {
      try {
        const shareUrl = `${window.location.origin}/share-decks/${deckKey}`
        const code = generate(shareUrl)
        const qrCanvas = document.createElement('canvas')
        code.toCanvas(qrCanvas, { pad: 0 })

        ctx.save()
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)
        ctx.restore()
      } catch (err) {
        console.warn('QR code generation failed in canvas:', err)
      }
    }

    // 3. 头部信息文本 (卡组名称、卡组代码)
    const textY = leftSectionY + logoH + leftSectionGap
    const fontStack =
      "'Microsoft JhengHei', 'PingFang TC', 'Heiti TC', 'Noto Sans TC', 'Noto Sans CJK TC', sans-serif"

    const maxTextWidth = (hasQr ? qrX - 24 : baseW - padding) - padding
    let currentX = padding

    // "卡组名称"
    ctx.font = `bold 16px ${fontStack}`
    ctx.fillStyle = '#000000'
    ctx.textBaseline = 'top'
    const label1 = '卡组名称'
    ctx.fillText(label1, currentX, textY)
    currentX += ctx.measureText(label1).width + 6

    // "卡组代码" 与代码值占用宽度预留
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

    // deckName (带省略号自适应截断)
    ctx.font = `16px ${fontStack}`
    ctx.fillStyle = '#000000'
    const truncatedDeckName = truncateText(ctx, deckName || '', availableNameWidth)
    ctx.fillText(truncatedDeckName, currentX, textY)
    currentX += ctx.measureText(truncatedDeckName).width + 16

    // "卡组代码"
    ctx.font = `bold 16px ${fontStack}`
    ctx.fillStyle = '#000000'
    ctx.fillText(label2, currentX, textY)
    currentX += label2Width + 6

    // deckKey 值
    ctx.font = `16px ${fontStack}`
    ctx.fillStyle = '#000000'
    ctx.fillText(codeVal, currentX, textY)

    // B. 绘制卡牌网格
    const gridStartY = headerY + headerH + gridTopGap

    targetCards.forEach((card, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const x = padding + col * (cardW + colGap)
      const y = gridStartY + row * (cardH + rowGap)

      // 1. 卡图 (若失败回退至 /placehold.webp)
      const img = cardImageMap.get(card.id) || placeholderImg
      if (img) {
        ctx.drawImage(img, x, y, cardW, cardH)
      } else {
        ctx.fillStyle = '#e0e0e0'
        ctx.fillRect(x, y, cardW, cardH)
      }

      // 2. 数量角标 (右下角 36x36 圆角 6px)
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

      // 角标数量文字
      ctx.font = `24px ${fontStack}`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(card.quantity || 1), badgeX + badgeW / 2, badgeY + badgeH / 2)
      ctx.restore()
    })
  }

  // 6. 导出 Blob 与 Object URL
  const width = canvas.width
  const height = canvas.height
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })

  // 立即释放 Canvas 显存/内存后备缓冲区
  canvas.width = 0
  canvas.height = 0

  if (!blob) {
    throw new Error('Canvas 转换 Blob 失败')
  }

  const src = URL.createObjectURL(blob)

  return {
    src,
    width,
    height,
    blob,
  }
}
