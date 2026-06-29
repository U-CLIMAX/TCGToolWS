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
  const cleanReplayContent = replayContent.replace(/<[^>]+>/g, '').trim()

  const tokens = cleanReplayContent.split(/\s+/)
  if (tokens.length === 0 || !tokens[0]) return null

  let bestCandidate = tokens[0]
  let currentCandidate = tokens[0]

  for (let i = 1; i < tokens.length; i++) {
    currentCandidate += ' ' + tokens[i]
    if (cleanPrefix.includes(currentCandidate)) {
      bestCandidate = currentCandidate
    } else {
      break
    }
  }
  return bestCandidate
}

/**
 * Replace card effect keywords with icon img tags.
 */
export const formatEffectToHtml = (rawEffect) => {
  const effect = rawEffect || '无'

  // Match strictly <br>【replay】 case insensitively with flexible <br> styles
  const matchReplay = effect.match(/(<br\s*\/?>)【replay】/i)

  if (matchReplay) {
    const fullTag = matchReplay[0]
    const brTag = matchReplay[1]
    const replayIndex = effect.indexOf(fullTag)

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
      let brPrefix = ''
      let cleanSeg = segment

      if (brMatch) {
        brPrefix = brMatch[1]
        cleanSeg = segment.substring(brPrefix.length)
      }

      // cleanSeg starts with 【replay】
      const postTagText = cleanSeg.substring('【replay】'.length)
      const replayName = extractReplayName(prefix, postTagText)

      if (replayName) {
        replayNames.push(replayName)
        const escapedName = escapeRegExp(replayName)
        const stripRegex = new RegExp(
          `<font\\s+color=["\\\\']*red["\\\\']*>\\s*${escapedName}\\s*</font>`,
          'gi'
        )

        // Strip font wrapper inside the segment first
        const strippedSeg = cleanSeg.replace(stripRegex, replayName)

        // Split strippedSeg into header (【replay】 + name) and body
        const headerRegex = new RegExp(`^(${escapeRegExp('【replay】')}\\s*${escapedName})`, 'i')
        const headerMatch = strippedSeg.match(headerRegex)

        if (headerMatch) {
          const headerRaw = headerMatch[1]
          const bodyRaw = strippedSeg.substring(headerRaw.length)

          let header = replaceIcons(headerRaw)
          const wrapRegex = new RegExp(`${escapedName}(?![^<>]*>)`, 'g')
          header = header.replace(wrapRegex, `<font color="red">${replayName}</font>`)

          const body = replaceIcons(bodyRaw)
          processedSegments.push(brPrefix + header + body)
        } else {
          processedSegments.push(brPrefix + replaceIcons(cleanSeg))
        }
      } else {
        processedSegments.push(brPrefix + replaceIcons(cleanSeg))
      }
    }

    // Now process the prefix: format all occurrences of the found replayNames in red
    for (const replayName of replayNames) {
      const escapedName = escapeRegExp(replayName)
      const stripRegex = new RegExp(
        `<font\\s+color=["\\\\']*red["\\\\']*>\\s*${escapedName}\\s*</font>`,
        'gi'
      )
      prefix = prefix.replace(stripRegex, replayName)

      const wrapRegex = new RegExp(`${escapedName}(?![^<>]*>)`, 'g')
      prefix = prefix.replace(wrapRegex, `<font color="red">${replayName}</font>`)
    }

    prefix = replaceIcons(prefix)
    const replayBlock = processedSegments.join('')

    const wrappedReplay = `<div class="replay-block" style="border: 3px solid #4caf50; border-radius: 8px; padding: 4px 7px; margin-top: 4px; display: block;">${replayBlock}</div>`

    return prefix + wrappedReplay
  }

  return replaceIcons(effect)
}
