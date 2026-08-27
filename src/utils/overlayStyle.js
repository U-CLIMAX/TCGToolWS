/**
 * 卡牌效果覆层的共享样式生成器
 *
 * 以 PNG 单卡导出尺寸 (400×557px) 为基准，
 * 根据实际卡片宽度等比例换算所有 px 值，
 * 确保 PNG 导出与 PDF 拼版的视觉效果一致。
 */

/** 基准卡片宽度（PNG 单卡导出） */
const BASE_W = 400

/** 统一的中文字体 fallback chain */
export const OVERLAY_FONT_FAMILY =
  "'LXGW WenKai Lite', 'Microsoft JhengHei', 'PingFang TC', 'Heiti TC', 'Noto Sans TC', 'Noto Sans CJK TC', sans-serif"

/** @param {number} n */
const round = (n) => Math.round(n * 100) / 100

/**
 * 计算覆层 bottom 定位值
 * @param {number} cardW - 卡片实际渲染宽度 (px)
 * @param {string} cardType - 卡片类型
 * @returns {string} CSS bottom 值
 */
export const getOverlayBottom = (cardW, cardType) => {
  const s = cardW / BASE_W
  return `${round((cardType === '事件卡' ? 53 : 67) * s)}px`
}

/**
 * 获取覆层样式对象（用于 inline style 或 CSS 生成）
 *
 * 当传入 cardType 时包含 bottom 定位；
 * 省略 cardType 则返回不含 bottom 的基础样式（适用于 CSS 类定义）。
 *
 * @param {number} cardW - 卡片实际渲染宽度 (px)
 * @param {string} [cardType] - 卡片类型（可选）
 * @returns {Record<string, string>}
 */
export const getOverlayStyle = (cardW, cardType) => {
  const s = cardW / BASE_W
  const r = (n) => round(n * s)

  const style = {
    position: 'absolute',
    left: `${r(12)}px`,
    right: `${r(12)}px`,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    color: '#000',
    padding: `${r(10)}px`,
    boxSizing: 'border-box',
    borderRadius: `${r(8)}px`,
    fontFamily: OVERLAY_FONT_FAMILY,
    fontSize: `${r(14.4)}px`,
    lineHeight: '1.2',
    textAlign: 'justify',
    wordBreak: 'break-word',
  }

  if (cardType) {
    style.bottom = getOverlayBottom(cardW, cardType)
  }

  return style
}

/**
 * 获取覆层内图标的样式对象
 * @param {number} cardW - 卡片实际渲染宽度 (px)
 * @returns {Record<string, string>}
 */
export const getIconStyle = (cardW) => {
  const s = cardW / BASE_W
  const r = (n) => round(n * s)
  return {
    height: `${r(14.4)}px`,
    verticalAlign: `${r(-2.4)}px`,
    display: 'inline-block',
  }
}

/**
 * 将 JS 样式对象转为 CSS 规则字符串
 * @param {string} selector - CSS 选择器
 * @param {Record<string, string>} styleObj - camelCase 样式对象
 * @returns {string} 完整的 CSS 规则
 */
export const styleToCssRule = (selector, styleObj) => {
  const props = Object.entries(styleObj)
    .map(([key, value]) => {
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
      return `  ${cssKey}: ${value};`
    })
    .join('\n')
  return `${selector} {\n${props}\n}`
}
