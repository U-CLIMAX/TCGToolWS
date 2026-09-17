/**
 * 將關鍵字或卡片文字進行標準化處理：
 * 1. Unicode NFKC 規格化（統一全形/半形字母、數字及符號）
 * 2. 轉為小寫（忽略大小寫差異）
 * 3. 統一加號符號（+、＋、﹢ -> +）
 * 4. 統一減號/破折號/連接號（-、－、﹣、−、–、—、― -> -）
 * 5. 統一乘號/字母x（x、X、ｘ、Ｘ、×、✕、✖、⨯ -> x）
 *
 * @param {string} str - 輸入文字
 * @returns {string} 標準化後的文字
 */
export const normalizeSearchText = (str) => {
  if (!str || typeof str !== 'string') return ''
  return str
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[＋﹢]/g, '+')
    .replace(/[－﹣−–—―]/g, '-')
    .replace(/[ｘＸ×✕✖⨯]/g, 'x')
}
