/**
 * Deck Mulligan & Monte Carlo Simulator for Weiss Schwarz
 */

/**
 * Default standard Weiss Schwarz mulligan rules:
 * Keep Level 0 cards up to 3 copies.
 */
export const getDefaultMulliganRules = () => [
  {
    id: 'default_rule_lvl0',
    type: 'level',
    operator: '=',
    targetValue: 0,
    limitType: 'at_most',
    limitCount: 3,
  },
]

/**
 * Expand deck cards by their quantity into a flat array of card objects.
 * CX (高潮卡) is normalized to Level 0.
 * @param {Array<Object>} cardList
 * @returns {Array<Object>}
 */
export const expandDeck = (cardList) => {
  if (!Array.isArray(cardList)) return []
  const expanded = []
  cardList.forEach((card) => {
    const qty = Number(card.quantity) || 1
    const normalizedLevel =
      card.level === '-' || card.level === undefined || card.level === null ? 0 : Number(card.level)

    for (let i = 0; i < qty; i++) {
      expanded.push({
        ...card,
        instanceId: `${card.id}_${i}`,
        normalizedLevel,
        baseId: card.baseId || card.id,
      })
    }
  })
  return expanded
}

/**
 * Check if a card satisfies a specific mulligan rule.
 * @param {Object} card
 * @param {Object} rule
 * @returns {boolean}
 */
export const matchesRule = (card, rule) => {
  if (!card || !rule) return false

  if (rule.type === 'specific_card') {
    return card.id === rule.targetValue || card.baseId === rule.targetValue
  }

  if (rule.type === 'card_type') {
    return card.type === rule.targetValue
  }

  if (rule.type === 'level') {
    const cardLevel = card.normalizedLevel ?? 0
    const target = Number(rule.targetValue)
    if (rule.operator === '>=') return cardLevel >= target
    if (rule.operator === '<=') return cardLevel <= target
    return cardLevel === target
  }

  return false
}

/**
 * Generate human-readable text for a rule
 * @param {Object} rule
 * @param {Array<Object>} cardList
 * @returns {string}
 */
export const getRuleDescription = (rule, cardList = []) => {
  if (!rule) return ''

  let conditionText = ''
  if (rule.type === 'specific_card') {
    const found = cardList.find((c) => c.id === rule.targetValue || c.baseId === rule.targetValue)
    const name = found ? found.name : ''
    conditionText = `指定卡「${rule.targetValue}${name ? ` · ${name}` : ''}」`
  } else if (rule.type === 'card_type') {
    conditionText = `种类为「${rule.targetValue}」`
  } else if (rule.type === 'level') {
    const opText = rule.operator === '>=' ? '等以上' : rule.operator === '<=' ? '等以下' : '等'
    conditionText = `等级 ${rule.targetValue} ${opText}`
  }

  let limitText = ''
  if (rule.limitType === 'all') {
    limitText = '保留 全部'
  } else if (rule.limitType === 'none' || rule.limitCount === 0) {
    limitText = '全部丢弃 (保留 0 张)'
  } else if (rule.limitType === 'at_most') {
    limitText = `保留 至多 ${rule.limitCount} 张`
  } else if (rule.limitType === 'at_least') {
    limitText = `保留 至少 ${rule.limitCount} 张`
  }

  return `${conditionText} ➔ ${limitText}`
}

/**
 * Evaluate mulligan decisions for a 5-card initial hand.
 * Priority from top to bottom. Unmatched cards are discarded.
 * @param {Array<Object>} hand
 * @param {Array<Object>} rules
 * @returns {{ keptIndices: Set<number>, keptCards: Array<Object>, discardedCards: Array<Object>, decisions: Array<Object> }}
 */
export const evaluateHandMulligan = (hand, rules) => {
  const keptIndices = new Set()
  const processedIndices = new Set()
  const decisions = []

  if (Array.isArray(rules) && rules.length > 0) {
    for (let rIdx = 0; rIdx < rules.length; rIdx++) {
      const rule = rules[rIdx]
      const matchingIndices = []

      for (let i = 0; i < hand.length; i++) {
        if (!processedIndices.has(i) && matchesRule(hand[i], rule)) {
          matchingIndices.push(i)
        }
      }

      if (matchingIndices.length === 0) continue

      // Mark all matching cards as claimed/processed by this higher priority rule
      matchingIndices.forEach((i) => processedIndices.add(i))

      let keepCount = 0
      if (rule.limitType === 'all') {
        keepCount = matchingIndices.length
      } else if (rule.limitType === 'none' || Number(rule.limitCount) === 0) {
        keepCount = 0
      } else if (rule.limitType === 'at_most') {
        keepCount = Math.min(matchingIndices.length, Number(rule.limitCount) || 0)
      } else if (rule.limitType === 'at_least') {
        keepCount = Math.min(
          matchingIndices.length,
          Math.max(Number(rule.limitCount) || 0, matchingIndices.length)
        )
      }

      for (let k = 0; k < keepCount; k++) {
        const idx = matchingIndices[k]
        keptIndices.add(idx)
        decisions.push({
          cardIndex: idx,
          card: hand[idx],
          action: 'keep',
          ruleId: rule.id,
          ruleIndex: rIdx + 1,
          ruleDescription: getRuleDescription(rule),
        })
      }

      for (let k = keepCount; k < matchingIndices.length; k++) {
        const idx = matchingIndices[k]
        decisions.push({
          cardIndex: idx,
          card: hand[idx],
          action: 'discard',
          ruleId: rule.id,
          ruleIndex: rIdx + 1,
          ruleDescription: getRuleDescription(rule),
          reason:
            rule.limitType === 'none' || Number(rule.limitCount) === 0
              ? `命中规则 #${rIdx + 1} (${getRuleDescription(rule)}) 全部丢弃`
              : `命中规则 #${rIdx + 1} (${getRuleDescription(rule)}) 超出保留上限`,
        })
      }
    }
  }

  // Cards not matched by any rule are discarded
  for (let i = 0; i < hand.length; i++) {
    if (!processedIndices.has(i)) {
      decisions.push({
        cardIndex: i,
        card: hand[i],
        action: 'discard',
        reason: '未命中任何保留规则',
      })
    }
  }

  // Sort decisions by card index
  decisions.sort((a, b) => a.cardIndex - b.cardIndex)

  return {
    keptIndices,
    keptCards: hand.filter((_, i) => keptIndices.has(i)),
    discardedCards: hand.filter((_, i) => !keptIndices.has(i)),
    decisions,
  }
}

/**
 * Execute a single simulated draw and mulligan.
 * @param {Array<Object>} expandedDeck
 * @param {Array<Object>} rules
 * @returns {Object}
 */
export const simulateSingleDraw = (expandedDeck, rules) => {
  const totalCards = expandedDeck.length
  if (totalCards === 0) return null

  // Partial Fisher-Yates with crypto random
  const indices = Array.from({ length: totalCards }, (_, i) => i)
  const drawCount = Math.min(5, totalCards)

  // Draw initial 5
  for (let i = 0; i < drawCount; i++) {
    const r = i + Math.floor(Math.random() * (totalCards - i))
    const temp = indices[i]
    indices[i] = indices[r]
    indices[r] = temp
  }

  const initialHand = indices.slice(0, drawCount).map((idx) => expandedDeck[idx])
  const evaluation = evaluateHandMulligan(initialHand, rules)

  const discardCount = evaluation.discardedCards.length
  const replacementCards = []

  if (discardCount > 0) {
    const startIdx = drawCount
    const maxReplacements = Math.min(discardCount, totalCards - startIdx)

    for (let i = 0; i < maxReplacements; i++) {
      const curr = startIdx + i
      const r = curr + Math.floor(Math.random() * (totalCards - curr))
      const temp = indices[curr]
      indices[curr] = indices[r]
      indices[r] = temp
      replacementCards.push(expandedDeck[indices[curr]])
    }
  }

  const finalHand = [...evaluation.keptCards, ...replacementCards]

  return {
    initialHand,
    keptCards: evaluation.keptCards,
    discardedCards: evaluation.discardedCards,
    replacementCards,
    finalHand,
    decisions: evaluation.decisions,
  }
}

/**
 * Fast zero-allocation mulligan evaluation for Monte Carlo simulation
 * @param {Array<Object>} hand - Array of cards (length <= 5)
 * @param {Array<Object>} rules - Mulligan rules
 * @param {Array<Object>} keptCardsBuf - Preallocated buffer for kept cards
 * @returns {number} Number of kept cards
 */
export const fastEvaluateMulligan = (hand, rules, keptCardsBuf) => {
  const handLen = hand.length
  let processedMask = 0
  let keptCount = 0

  const ruleCount = rules ? rules.length : 0
  for (let rIdx = 0; rIdx < ruleCount; rIdx++) {
    const rule = rules[rIdx]
    let matchCount = 0
    let m0 = -1
    let m1 = -1
    let m2 = -1
    let m3 = -1
    let m4 = -1

    for (let i = 0; i < handLen; i++) {
      if ((processedMask & (1 << i)) === 0 && matchesRule(hand[i], rule)) {
        if (matchCount === 0) m0 = i
        else if (matchCount === 1) m1 = i
        else if (matchCount === 2) m2 = i
        else if (matchCount === 3) m3 = i
        else if (matchCount === 4) m4 = i
        matchCount++
        processedMask |= 1 << i
      }
    }

    if (matchCount === 0) continue

    let keepLimit = 0
    if (rule.limitType === 'all') {
      keepLimit = matchCount
    } else if (rule.limitType === 'none' || Number(rule.limitCount) === 0) {
      keepLimit = 0
    } else if (rule.limitType === 'at_most') {
      keepLimit = Math.min(matchCount, Number(rule.limitCount) || 0)
    } else if (rule.limitType === 'at_least') {
      keepLimit = Math.min(matchCount, Math.max(Number(rule.limitCount) || 0, matchCount))
    }

    if (keepLimit > 0 && m0 !== -1) keptCardsBuf[keptCount++] = hand[m0]
    if (keepLimit > 1 && m1 !== -1) keptCardsBuf[keptCount++] = hand[m1]
    if (keepLimit > 2 && m2 !== -1) keptCardsBuf[keptCount++] = hand[m2]
    if (keepLimit > 3 && m3 !== -1) keptCardsBuf[keptCount++] = hand[m3]
    if (keepLimit > 4 && m4 !== -1) keptCardsBuf[keptCount++] = hand[m4]
  }

  return keptCount
}

/**
 * Execute fast Monte Carlo simulation
 * @param {Array<Object>} cardList - Original unique cards with quantity
 * @param {Array<Object>} rules - Mulligan rules
 * @param {number} iterations - Number of simulations (e.g. 1000, 10000, 50000)
 * @returns {Object} Aggregated statistical data
 */
export const runMonteCarloSimulation = (cardList, rules, iterations = 10000) => {
  const expandedDeck = expandDeck(cardList)
  const totalDeckSize = expandedDeck.length
  if (totalDeckSize === 0) return null

  const handSize = Math.min(5, totalDeckSize)

  // Map card IDs to tracking stats
  const cardStatsMap = new Map()
  cardList.forEach((c) => {
    cardStatsMap.set(c.id, {
      card: c,
      initialHitCount: 0,
      finalHitCount: 0,
      initialTotalCopies: 0,
      finalTotalCopies: 0,
    })
  })

  // Types & Levels tracking
  const typeStats = {
    角色卡: {
      initialHits: 0,
      finalHits: 0,
      initialCopies: 0,
      finalCopies: 0,
      finalCountDist: [0, 0, 0, 0, 0, 0],
    },
    事件卡: {
      initialHits: 0,
      finalHits: 0,
      initialCopies: 0,
      finalCopies: 0,
      finalCountDist: [0, 0, 0, 0, 0, 0],
    },
    高潮卡: {
      initialHits: 0,
      finalHits: 0,
      initialCopies: 0,
      finalCopies: 0,
      finalCountDist: [0, 0, 0, 0, 0, 0],
    },
  }

  const levelStats = {
    0: { initialHits: 0, finalHits: 0, finalCopies: 0, finalCountDist: [0, 0, 0, 0, 0, 0] },
    1: { initialHits: 0, finalHits: 0, finalCopies: 0, finalCountDist: [0, 0, 0, 0, 0, 0] },
    2: { initialHits: 0, finalHits: 0, finalCopies: 0, finalCountDist: [0, 0, 0, 0, 0, 0] },
    3: { initialHits: 0, finalHits: 0, finalCopies: 0, finalCountDist: [0, 0, 0, 0, 0, 0] },
  }

  let totalDiscardCount = 0
  let zeroCxFinalHands = 0
  let atLeastOneLvl0CharFinalHands = 0

  const indices = new Int16Array(totalDeckSize)
  const baseIndices = new Int16Array(totalDeckSize)
  for (let i = 0; i < totalDeckSize; i++) baseIndices[i] = i

  const initialHandBuf = new Array(handSize)
  const finalHandBuf = new Array(handSize)
  const keptCardsBuf = new Array(handSize)

  for (let iter = 0; iter < iterations; iter++) {
    // Fast copy indices
    indices.set(baseIndices)

    // Partial shuffle first 5 cards
    for (let i = 0; i < handSize; i++) {
      const r = i + ((Math.random() * (totalDeckSize - i)) | 0)
      const temp = indices[i]
      indices[i] = indices[r]
      indices[r] = temp
      initialHandBuf[i] = expandedDeck[indices[i]]
    }

    // Evaluate initial hand stats
    let initCharCount = 0
    let initEventCount = 0
    let initCxCount = 0
    let l0 = 0
    let l1 = 0
    let l2 = 0
    let l3 = 0

    for (let i = 0; i < handSize; i++) {
      const c = initialHandBuf[i]
      const stat = cardStatsMap.get(c.id)
      if (stat) {
        stat.initialTotalCopies++
        let isFirstSeen = true
        for (let k = 0; k < i; k++) {
          if (initialHandBuf[k].id === c.id) {
            isFirstSeen = false
            break
          }
        }
        if (isFirstSeen) {
          stat.initialHitCount++
        }
      }

      if (c.type === '角色卡') initCharCount++
      else if (c.type === '事件卡') initEventCount++
      else if (c.type === '高潮卡') initCxCount++

      if (c.normalizedLevel === 0) l0++
      else if (c.normalizedLevel === 1) l1++
      else if (c.normalizedLevel === 2) l2++
      else if (c.normalizedLevel === 3) l3++
    }

    if (initCharCount > 0) typeStats['角色卡'].initialHits++
    if (initEventCount > 0) typeStats['事件卡'].initialHits++
    if (initCxCount > 0) typeStats['高潮卡'].initialHits++
    typeStats['角色卡'].initialCopies += initCharCount
    typeStats['事件卡'].initialCopies += initEventCount
    typeStats['高潮卡'].initialCopies += initCxCount

    if (l0 > 0) levelStats[0].initialHits++
    if (l1 > 0) levelStats[1].initialHits++
    if (l2 > 0) levelStats[2].initialHits++
    if (l3 > 0) levelStats[3].initialHits++

    // Fast mulligan evaluation (0 heap allocations)
    const keptCount = fastEvaluateMulligan(initialHandBuf, rules, keptCardsBuf)
    const discardCount = handSize - keptCount
    totalDiscardCount += discardCount

    let finalHandCount = 0
    for (let i = 0; i < keptCount; i++) {
      finalHandBuf[finalHandCount++] = keptCardsBuf[i]
    }

    if (discardCount > 0) {
      const startIdx = handSize
      const maxReplacements = Math.min(discardCount, totalDeckSize - startIdx)
      for (let i = 0; i < maxReplacements; i++) {
        const curr = startIdx + i
        const r = curr + ((Math.random() * (totalDeckSize - curr)) | 0)
        const temp = indices[curr]
        indices[curr] = indices[r]
        indices[r] = temp
        finalHandBuf[finalHandCount++] = expandedDeck[indices[curr]]
      }
    }

    // Evaluate final hand stats
    let finalCharCount = 0
    let finalEventCount = 0
    let finalCxCount = 0
    let fl0 = 0
    let fl1 = 0
    let fl2 = 0
    let fl3 = 0
    let hasLvl0Char = false

    for (let i = 0; i < finalHandCount; i++) {
      const c = finalHandBuf[i]
      const stat = cardStatsMap.get(c.id)
      if (stat) {
        stat.finalTotalCopies++
        let isFirstSeen = true
        for (let k = 0; k < i; k++) {
          if (finalHandBuf[k].id === c.id) {
            isFirstSeen = false
            break
          }
        }
        if (isFirstSeen) {
          stat.finalHitCount++
        }
      }

      if (c.type === '角色卡') {
        finalCharCount++
        if (c.normalizedLevel === 0) hasLvl0Char = true
      } else if (c.type === '事件卡') {
        finalEventCount++
      } else if (c.type === '高潮卡') {
        finalCxCount++
      }

      if (c.normalizedLevel === 0) fl0++
      else if (c.normalizedLevel === 1) fl1++
      else if (c.normalizedLevel === 2) fl2++
      else if (c.normalizedLevel === 3) fl3++
    }

    if (finalCharCount > 0) typeStats['角色卡'].finalHits++
    if (finalEventCount > 0) typeStats['事件卡'].finalHits++
    if (finalCxCount > 0) typeStats['高潮卡'].finalHits++
    typeStats['角色卡'].finalCopies += finalCharCount
    typeStats['事件卡'].finalCopies += finalEventCount
    typeStats['高潮卡'].finalCopies += finalCxCount
    typeStats['角色卡'].finalCountDist[Math.min(finalCharCount, 5)]++
    typeStats['事件卡'].finalCountDist[Math.min(finalEventCount, 5)]++
    typeStats['高潮卡'].finalCountDist[Math.min(finalCxCount, 5)]++

    if (finalCxCount === 0) zeroCxFinalHands++
    if (hasLvl0Char) atLeastOneLvl0CharFinalHands++

    if (fl0 > 0) levelStats[0].finalHits++
    if (fl1 > 0) levelStats[1].finalHits++
    if (fl2 > 0) levelStats[2].finalHits++
    if (fl3 > 0) levelStats[3].finalHits++
    levelStats[0].finalCopies += fl0
    levelStats[1].finalCopies += fl1
    levelStats[2].finalCopies += fl2
    levelStats[3].finalCopies += fl3
    levelStats[0].finalCountDist[Math.min(fl0, 5)]++
    levelStats[1].finalCountDist[Math.min(fl1, 5)]++
    levelStats[2].finalCountDist[Math.min(fl2, 5)]++
    levelStats[3].finalCountDist[Math.min(fl3, 5)]++
  }

  // Format and compile final results
  const cardResults = Array.from(cardStatsMap.values()).map((item) => {
    const initialProb = (item.initialHitCount / iterations) * 100
    const finalProb = (item.finalHitCount / iterations) * 100
    const deltaProb = finalProb - initialProb
    const avgInitialCopies = item.initialTotalCopies / iterations
    const avgFinalCopies = item.finalTotalCopies / iterations

    return {
      card: item.card,
      quantity: item.card.quantity || 1,
      initialProb: Number(initialProb.toFixed(2)),
      finalProb: Number(finalProb.toFixed(2)),
      deltaProb: Number(deltaProb.toFixed(2)),
      avgInitialCopies: Number(avgInitialCopies.toFixed(2)),
      avgFinalCopies: Number(avgFinalCopies.toFixed(2)),
    }
  })

  // Format type stats
  const typeResults = Object.keys(typeStats).map((typeKey) => {
    const t = typeStats[typeKey]
    const initialProb = (t.initialHits / iterations) * 100
    const finalProb = (t.finalHits / iterations) * 100
    const avgCopies = t.finalCopies / iterations
    const countDistribution = t.finalCountDist.map((c) =>
      Number(((c / iterations) * 100).toFixed(1))
    )

    return {
      type: typeKey,
      initialProb: Number(initialProb.toFixed(2)),
      finalProb: Number(finalProb.toFixed(2)),
      deltaProb: Number((finalProb - initialProb).toFixed(2)),
      avgCopies: Number(avgCopies.toFixed(2)),
      distribution: countDistribution,
    }
  })

  // Format level stats
  const levelResults = [0, 1, 2, 3].map((lvl) => {
    const l = levelStats[lvl]
    const initialProb = (l.initialHits / iterations) * 100
    const finalProb = (l.finalHits / iterations) * 100
    const avgCopies = l.finalCopies / iterations
    const countDistribution = l.finalCountDist.map((c) =>
      Number(((c / iterations) * 100).toFixed(1))
    )

    return {
      level: lvl,
      initialProb: Number(initialProb.toFixed(2)),
      finalProb: Number(finalProb.toFixed(2)),
      deltaProb: Number((finalProb - initialProb).toFixed(2)),
      avgCopies: Number(avgCopies.toFixed(2)),
      distribution: countDistribution,
    }
  })

  return {
    iterations,
    totalDeckSize,
    avgDiscardCount: Number((totalDiscardCount / iterations).toFixed(2)),
    zeroCxProb: Number(((zeroCxFinalHands / iterations) * 100).toFixed(2)),
    atLeastOneLvl0CharProb: Number(((atLeastOneLvl0CharFinalHands / iterations) * 100).toFixed(2)),
    cardResults,
    typeResults,
    levelResults,
  }
}
