const ICON_MAP = {
  '【CX联动】': 'cx',
  '【自】': 'auto',
  '【永】': 'cont',
  '【起】': 'act',
  '【竖置】': 'stand',
  '【横置】': 'rest',
  '【反击】': 'backup',
  '【倒置】': 'reversed',
  '【一回合1次】': 'turn1',
  '【一回合2次】': 'turn2',
  '【一回合3次】': 'turn3',
  '【时计区】': 'alarm',
  '【LINK】': 'link',
  '【replay】': 'replay',
}
const ICON_REGEX = new RegExp(Object.keys(ICON_MAP).join('|'), 'g')

/**
 * 將卡片效果文本中的關鍵字替換為圖示 img 標籤。
 * @param {string} rawEffect - 原始效果文本
 * @returns {string} - 替換為 <img> 標籤的 HTML 字符串
 */
export const formatEffectToHtml = (rawEffect) => {
  const effect = rawEffect || '无'

  let replaced = effect.replace(ICON_REGEX, (match) => {
    const icon = ICON_MAP[match]
    return icon ? ` <img src="/effect-icons/${icon}.svg"> ` : match
  })

  // 補上缺少 inline-icon 的 img
  replaced = replaced.replace(/<img\b(?![^>]*\bclass=)/g, '<img class="inline-icon"')

  return replaced
}
