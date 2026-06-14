import SensitiveWordTool from 'sensitive-word-tool'

const sensitiveWordTool = new SensitiveWordTool({ useDefaultWords: true })

/**
 * Verifies if a string contains sensitive words.
 * @param {string} text - The text to check.
 * @returns {boolean} - True if sensitive words are found, false otherwise.
 */
export const hasSensitiveWords = (text) => {
  if (!text) return false
  return sensitiveWordTool.verify(text)
}
