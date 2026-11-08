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
  '【game1】': 'game1',
}
const ICON_REGEX = new RegExp(Object.keys(ICON_MAP).join('|'), 'g')

const replaceIcons = (text) => {
  let replaced = text.replace(ICON_REGEX, (match) => {
    const icon = ICON_MAP[match]
    return icon ? ` <img src="/effect-icons/${icon}.svg"> ` : match
  })

  replaced = replaced.replace(/<img\b(?![^>]*\bclass=)/g, '<img class="inline-icon"')

  return replaced
}

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const extractReplayName = (prefix, replayContent) => {
  const cleanPrefix = prefix.replace(/<[^>]+>/g, '')
  const cleanContent = replayContent
    .replace(/<[^>]+>/g, '')
    .trim()
    .replace(/^(?:\s*【[^】]+】)*\s*/, '')

  const tokens = cleanContent.split(/\s+/)
  if (!tokens[0] || !cleanPrefix.includes(tokens[0])) return null

  let best = tokens[0]
  let cur = tokens[0]

  for (let i = 1; i < tokens.length; i++) {
    cur += ' ' + tokens[i]
    if (cleanPrefix.includes(cur)) {
      best = cur
    } else {
      break
    }
  }
  return best
}

/**
 * Replace card effect keywords with icon img tags.
 */
export const formatEffectToHtml = (rawEffect, cardW = 400) => {
  const effect = rawEffect || '无'
  const width = Number.isFinite(cardW) && cardW > 0 ? cardW : 400
  const scale = width / 400
  const px = (value) => `${Math.round(value * scale * 100) / 100}px`

  // Match strictly <br>【replay】 case insensitively with flexible <br> styles
  const matchReplay = effect.match(/(<br\s*\/?>)【replay】/i)

  if (matchReplay) {
    const brTag = matchReplay[1]
    const replayIndex = matchReplay.index

    let prefix = effect.substring(0, replayIndex)
    const replayBlockRaw = effect.substring(replayIndex + brTag.length) // starts with 【replay】

    // Split the replay block by internal `<br>【replay】` boundaries (case insensitive)
    // Using positive lookahead so that the split boundary starts with the <br> tag
    const segments = replayBlockRaw.split(/(?=<br\s*\/?>【replay】)/i)
    const replayNames = []
    const processedSegments = []

    for (const segment of segments) {
      // Check if this segment starts with <br> tag
      const brMatch = segment.match(/^(<br\s*\/?>)/i)
      const brPrefix = brMatch ? brMatch[1] : ''
      const cleanSeg = brMatch ? segment.substring(brPrefix.length) : segment

      const postTagText = cleanSeg.replace(/^【replay】/i, '')
      const replayName = extractReplayName(prefix, postTagText)

      if (replayName) {
        replayNames.push(replayName)
        const escapedName = escapeRegExp(replayName)
        const stripRegex = new RegExp(
          `<font\\s+color=["']?red["']?>\\s*${escapedName}\\s*</font>`,
          'gi'
        )
        const strippedSeg = cleanSeg.replace(stripRegex, replayName)
        const match = strippedSeg.match(
          new RegExp(`^(【replay】(?:\\s*【[^】]+】)*\\s*)(${escapedName})([\\s\\S]*)`, 'i')
        )

        if (match) {
          processedSegments.push(
            brPrefix +
              replaceIcons(match[1]) +
              `<font color="red">${replayName}</font>` +
              replaceIcons(match[3])
          )
        } else {
          processedSegments.push(brPrefix + replaceIcons(cleanSeg))
        }
      } else {
        processedSegments.push(brPrefix + replaceIcons(cleanSeg))
      }
    }

    // Now process the prefix: format all occurrences of the found replayNames in red
    const uniqueNames = Array.from(new Set(replayNames)).sort((a, b) => b.length - a.length)
    for (const replayName of uniqueNames) {
      const escapedName = escapeRegExp(replayName)
      const stripRegex = new RegExp(
        `<font\\s+color=["']?red["']?>\\s*${escapedName}\\s*</font>`,
        'gi'
      )
      prefix = prefix.replace(stripRegex, replayName)

      const wrapRegex = new RegExp(`${escapedName}(?![^<>]*>)`, 'g')
      prefix = prefix.replace(wrapRegex, `<font color="red">${replayName}</font>`)
    }

    prefix = replaceIcons(prefix)
    const replayBlock = processedSegments.join('')

    const wrappedReplay = `<div class="replay-block" style="border: ${px(3)} solid #4caf50; border-radius: ${px(8)}; padding: ${px(4)} ${px(7)}; margin-top: ${px(4)}; display: block;">${replayBlock}</div>`

    return prefix + wrappedReplay
  }

  return replaceIcons(effect)
}
