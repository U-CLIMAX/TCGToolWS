let sensitiveWordTool = null

const getSensitiveWordTool = async () => {
  if (!sensitiveWordTool) {
    const SensitiveWordTool = (await import('sensitive-word-tool')).default
    sensitiveWordTool = new SensitiveWordTool({ useDefaultWords: true })
  }
  return sensitiveWordTool
}

// List of exception words (in lowercase).
// These words are only treated as sensitive if they do not coexist with other letter/number characters.
const EXCEPTION_WORDS = new Set(['sm'])

/**
 * Verifies if a string contains sensitive words.
 * @param {string} text - The text to check.
 * @returns {Promise<boolean>} - True if sensitive words are found, false otherwise.
 */
export const hasSensitiveWords = async (text) => {
  if (!text) return false

  const tool = await getSensitiveWordTool()
  const matches = tool.match(text)
  if (matches.length === 0) return false

  const cleaned = text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  const remainingMatches = matches.filter((match) => {
    const lowerMatch = match.toLowerCase()
    if (EXCEPTION_WORDS.has(lowerMatch)) {
      return cleaned === lowerMatch
    }
    return true
  })

  return remainingMatches.length > 0
}
