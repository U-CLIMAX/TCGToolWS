/**
 * 從 Decklog 官方 API 獲取指定 Key 的 JSON 資料
 * @param {string} key - Decklog 的牌組代碼 (例如: 4K40E)
 * @returns {Promise<object>} - 官方 API 回傳的 JSON 物件
 */
export const fetchDecklogData = async (key) => {
  const url = `https://decklog.bushiroad.com/system/app/api/view/${key}`

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://decklog.bushiroad.com',
    'Referer': `https://decklog.bushiroad.com/view/${key}`,
    'Content-Type': 'application/json',
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
  })

  if (!response.ok) {
    throw new Error(`Decklog API request failed with status: ${response.status}`)
  }

  return await response.json()
}
