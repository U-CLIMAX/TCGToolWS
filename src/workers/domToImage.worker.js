import { expose } from 'comlink'

/**
 * 單卡 DOM 導出圖片背景渲染 Worker (基於 Comlink RPC)
 * 使用 OffscreenCanvas 在獨立線程中光柵化並非同步壓縮 PNG，徹底釋放主線程
 */
const domToImageWorker = {
  async renderToBlob({ bitmap, width, height }) {
    try {
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('無法建立 OffscreenCanvas 2D 上下文')

      ctx.drawImage(bitmap, 0, 0, width, height)

      const blob = await canvas.convertToBlob({ type: 'image/png' })
      return blob
    } finally {
      bitmap?.close?.()
    }
  },
}

expose(domToImageWorker)
