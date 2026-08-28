import { sortCards } from '@/utils/cardsSort.js'
import { getCardUrls } from '@/utils/getCardImage'
import { generate } from 'lean-qr'
import logoUrl from '@/assets/ui/logo.webp'
import { batchLoadImages, loadImageWithDecode } from '@/utils/cardImageLoader.js'
import { wrap, transfer } from 'comlink'
import DeckCanvasWorker from '@/workers/deckCanvas.worker.js?worker'

/**
 * 渲染卡組大圖 (支援 U-CLIMAX 與 TTS 模式)
 * 透過 Web Worker + OffscreenCanvas 進行背景拼版與壓縮
 *
 * @param {Object} options
 * @param {Object|Array} options.cards - 卡牌列表
 * @param {string} options.deckName - 卡組名稱
 * @param {string} options.deckKey - 卡組代碼
 * @param {'u_climax'|'tts'} [options.mode='u_climax'] - 導出模式
 * @param {boolean} [options.includeQrCode=true] - 是否生成二維碼
 * @param {number} [options.scale=2] - 縮放倍數
 * @returns {Promise<{ src: string, width: number, height: number, blob: Blob, format: 'png' }>}
 */
export const renderDeckToCanvas = async ({
  cards,
  deckName = '',
  deckKey = '',
  mode = 'u_climax',
  includeQrCode = true,
  scale = 2,
}) => {
  // 等待 Web 偏好字體載入，確保文字繪製時取得精確字形
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      // 忽略字體探測失敗
    }
  }

  const rawCards = cards ? (Array.isArray(cards) ? cards : Object.values(cards)) : []
  const sortedCards = sortCards(rawCards)

  const targetCards =
    mode === 'tts'
      ? sortedCards.flatMap((card) => Array(Number(card.quantity) || 1).fill(card))
      : sortedCards

  const placeholderImg = await loadImageWithDecode('/placehold.webp')
  const uniqueCards = Array.from(new Map(targetCards.map((c) => [c.id, c])).values())
  const cardUrls = uniqueCards
    .map((card) => card.imgUrl || getCardUrls(card.cardIdPrefix, card.id)?.base)
    .filter(Boolean)

  const loadedImagesMap = await batchLoadImages(cardUrls, 6)
  const cardImageMap = new Map()

  uniqueCards.forEach((card) => {
    const url = card.imgUrl || getCardUrls(card.cardIdPrefix, card.id)?.base
    const img = (url && loadedImagesMap.get(url)) || placeholderImg
    if (img) cardImageMap.set(card.id, img)
  })

  let logoImg = null
  if (mode === 'u_climax') {
    logoImg = await loadImageWithDecode(logoUrl)
  }

  // 轉換為 ImageBitmap 以支援零拷貝移交給 Worker
  const placeholderBitmap = placeholderImg ? await createImageBitmap(placeholderImg) : null
  const logoBitmap = logoImg ? await createImageBitmap(logoImg) : null

  let qrBitmap = null
  if (includeQrCode && Boolean(deckKey) && mode === 'u_climax') {
    try {
      const shareUrl = `${window.location.origin}/share-decks/${deckKey}`
      const code = generate(shareUrl)
      const qrCanvas = document.createElement('canvas')
      code.toCanvas(qrCanvas, { pad: 0 })
      qrBitmap = await createImageBitmap(qrCanvas)
    } catch (err) {
      console.warn('QR code generation failed:', err)
    }
  }

  const cardBitmaps = await Promise.all(
    uniqueCards.map(async (card) => {
      const img = cardImageMap.get(card.id)
      if (!img) return null
      try {
        const bitmap = await createImageBitmap(img)
        return { id: card.id, bitmap }
      } catch {
        return null
      }
    })
  )

  const transferList = []
  if (placeholderBitmap) transferList.push(placeholderBitmap)
  if (logoBitmap) transferList.push(logoBitmap)
  if (qrBitmap) transferList.push(qrBitmap)
  for (const item of cardBitmaps) {
    if (item?.bitmap) transferList.push(item.bitmap)
  }

  const worker = new DeckCanvasWorker()
  const api = wrap(worker)

  let result
  try {
    result = await api.render(
      transfer(
        {
          targetCards,
          cardBitmaps,
          placeholderBitmap,
          logoBitmap,
          qrBitmap,
          deckName,
          deckKey,
          mode,
          scale,
        },
        transferList
      )
    )
  } finally {
    worker.terminate()
  }

  const src = URL.createObjectURL(result.blob)
  return {
    src,
    width: result.width,
    height: result.height,
    blob: result.blob,
    format: result.format,
  }
}
