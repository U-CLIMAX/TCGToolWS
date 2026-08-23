/**
 * Deck Mulligan & Monte Carlo Simulator for Weiss Schwarz
 */

const CARD_TYPES = ['角色卡', '事件卡', '高潮卡']
const LEVELS = [0, 1, 2, 3]
const MATCH_BUF = new Int32Array(5)

/**
 * Default standard Weiss Schwarz mulligan rules:
 * Keep Level 0 cards up to 3 copies.
 */
export const getDefaultMulliganRules = () => [
  {
    id: 'default_rule_lvl0',
    enabled: true,
    conditionType: 'always',
    conditionCard: null,
    conditionCardKeepCount: 1,
    type: 'level',
    operator: '=',
    targetValue: 0,
    limitType: 'at_most',
    limitCount: 3,
    priorityModifier: 'none',
    priorityCard: null,
    priorityCount: 1,
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
  cardList.forEach((card, cardIdx) => {
    const qty = Number(card.quantity) || 1
    const normalizedLevel =
      card.level === '-' || card.level === undefined || card.level === null ? 0 : Number(card.level)
    const normalizedTriggerSoul =
      card.trigger_soul_count === '-' ||
      card.trigger_soul_count === undefined ||
      card.trigger_soul_count === null
        ? 0
        : Number(card.trigger_soul_count)
    const typeIdx =
      card.type === '角色卡' ? 0 : card.type === '事件卡' ? 1 : card.type === '高潮卡' ? 2 : -1

    for (let i = 0; i < qty; i++) {
      expanded.push({
        ...card,
        cardIdx,
        normalizedLevel,
        normalizedTriggerSoul,
        typeIdx,
        baseId: card.baseId || card.id,
      })
    }
  })
  return expanded
}

/**
 * Check if a hand satisfies a rule's execution precondition.
 * @param {Array<Object>} hand
 * @param {Object} rule
 * @returns {boolean}
 */
const checkRulePrecondition = (hand, rule) => {
  if (!rule || !rule.conditionType || rule.conditionType === 'always' || !rule.conditionCard) {
    return true
  }
  const target = rule.conditionCard
  const hasCard = hand.some((c) => c && (c.id === target || c.baseId === target))
  return rule.conditionType === 'has_card'
    ? hasCard
    : rule.conditionType === 'not_has_card'
      ? !hasCard
      : true
}

/**
 * Check if a card satisfies a specific mulligan rule.
 * @param {Object} card
 * @param {Object} rule
 * @returns {boolean}
 */
const matchesRule = (card, rule) => {
  if (!card || !rule) return false
  if (rule.type === 'specific_card')
    return card.id === rule.targetValue || card.baseId === rule.targetValue
  if (rule.type === 'card_type') return card.type === rule.targetValue
  if (rule.type === 'level') {
    const lvl = card.normalizedLevel ?? 0
    const target = Number(rule.targetValue)
    return rule.operator === '>='
      ? lvl >= target
      : rule.operator === '<='
        ? lvl <= target
        : lvl === target
  }
  if (rule.type === 'trigger_soul' || rule.type === 'trigger_soul_count') {
    const soul =
      card.normalizedTriggerSoul ??
      (card.trigger_soul_count === '-' ||
      card.trigger_soul_count === undefined ||
      card.trigger_soul_count === null
        ? 0
        : Number(card.trigger_soul_count))
    const target = Number(rule.targetValue)
    return rule.operator === '>='
      ? soul >= target
      : rule.operator === '<='
        ? soul <= target
        : soul === target
  }
  return false
}

/**
 * Filter and select matching candidates to be kept for evaluateHandMulligan.
 * @param {Array<{ index: number, card: Object }>} matching
 * @param {Object} rule
 * @returns {Array<{ index: number, card: Object }>}
 */
const partitionMatchingCards = (matching, rule) => {
  const { limitType, limitCount = 0, priorityModifier, priorityCard, priorityCount = 1 } = rule
  if (limitType === 'all') return matching
  if (limitType === 'none' || Number(limitCount) <= 0) return []

  const quota = Math.max(0, Number(limitCount) || 0)
  const isPriority = (c) => priorityCard && (c.id === priorityCard || c.baseId === priorityCard)

  if (priorityModifier === 'prioritize_card' && priorityCard) {
    const prio = matching.filter((m) => isPriority(m.card))
    const norm = matching.filter((m) => !isPriority(m.card))
    const pMax = Math.min(prio.length, Number(priorityCount) || 1, quota)
    const keptPrio = prio.slice(0, pMax)
    const remCandidates = [...norm, ...prio.slice(pMax)]
    const keptNorm = remCandidates.slice(0, Math.max(0, quota - keptPrio.length))
    return [...keptPrio, ...keptNorm]
  }

  if (priorityModifier === 'exclude_card' && priorityCard) {
    const norm = matching.filter((m) => !isPriority(m.card))
    return norm.slice(0, quota)
  }

  return matching.slice(0, quota)
}

/**
 * Evaluate mulligan decisions for a 5-card initial hand.
 * Priority from top to bottom. Unmatched cards are discarded.
 * @param {Array<Object>} hand
 * @param {Array<Object>} rules
 * @returns {{ keptIndices: Set<number>, keptCards: Array<Object>, discardedCards: Array<Object> }}
 */
const evaluateHandMulligan = (hand, rules) => {
  const keptIndices = new Set()
  const processedIndices = new Set()

  if (Array.isArray(rules) && rules.length > 0) {
    for (let rIdx = 0; rIdx < rules.length; rIdx++) {
      const rule = rules[rIdx]
      if (!rule || rule.enabled === false || !checkRulePrecondition(hand, rule)) continue

      // Precondition has_card: auto-keep condition card copies
      if (rule.conditionType === 'has_card' && rule.conditionCard) {
        const condCard = rule.conditionCard
        const condMax = Math.max(1, Number(rule.conditionCardKeepCount) || 1)
        let condKept = 0

        for (let i = 0; i < hand.length; i++) {
          if (
            !processedIndices.has(i) &&
            (hand[i].id === condCard || hand[i].baseId === condCard) &&
            condKept < condMax
          ) {
            keptIndices.add(i)
            processedIndices.add(i)
            condKept++
          }
        }
      }

      // Collect matching cards not yet claimed
      const matching = []
      for (let i = 0; i < hand.length; i++) {
        if (!processedIndices.has(i) && matchesRule(hand[i], rule)) {
          matching.push({ index: i, card: hand[i] })
        }
      }
      if (matching.length === 0) continue

      matching.forEach((m) => processedIndices.add(m.index))
      const kept = partitionMatchingCards(matching, rule)

      for (const item of kept) {
        keptIndices.add(item.index)
      }
    }
  }

  return {
    keptIndices,
    keptCards: hand.filter((_, i) => keptIndices.has(i)),
    discardedCards: hand.filter((_, i) => !keptIndices.has(i)),
  }
}

/**
 * Execute a single simulated draw and mulligan.
 * @param {Array<Object>} expandedDeck
 * @param {Array<Object>} rules
 * @returns {Object}
 */
export const simulateSingleDraw = (expandedDeck, rules) => {
  const totalCards = expandedDeck?.length || 0
  if (totalCards === 0) return null

  const indices = Array.from({ length: totalCards }, (_, i) => i)
  const drawCount = Math.min(5, totalCards)

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

  return {
    initialHand,
    keptIndices: evaluation.keptIndices,
    keptCards: evaluation.keptCards,
    discardedCards: evaluation.discardedCards,
    replacementCards,
    finalHand: [...evaluation.keptCards, ...replacementCards],
  }
}

/**
 * Fast zero-allocation mulligan evaluation for Monte Carlo simulation
 * @param {Array<Object>} hand - Array of cards (length <= 5)
 * @param {Array<Object>} rules - Mulligan rules
 * @param {Array<Object>} keptCardsBuf - Preallocated buffer for kept cards
 * @returns {number} Number of kept cards
 */
const fastEvaluateMulligan = (hand, rules, keptCardsBuf) => {
  const handLen = hand?.length || 0
  let processedMask = 0
  let keptCount = 0
  const ruleCount = rules?.length || 0

  for (let rIdx = 0; rIdx < ruleCount; rIdx++) {
    const rule = rules[rIdx]
    if (!rule || rule.enabled === false) continue

    const {
      conditionType,
      conditionCard,
      conditionCardKeepCount,
      limitType,
      limitCount,
      priorityModifier,
      priorityCard,
      priorityCount,
    } = rule

    // Precondition check
    if (conditionCard && (conditionType === 'has_card' || conditionType === 'not_has_card')) {
      let found = false
      for (let i = 0; i < handLen; i++) {
        if (hand[i].id === conditionCard || hand[i].baseId === conditionCard) {
          found = true
          break
        }
      }
      if (conditionType === 'has_card') {
        if (!found) continue
        const condMax = Number(conditionCardKeepCount) || 1
        let condKept = 0
        for (let i = 0; i < handLen; i++) {
          if (
            (processedMask & (1 << i)) === 0 &&
            (hand[i].id === conditionCard || hand[i].baseId === conditionCard) &&
            condKept < condMax
          ) {
            keptCardsBuf[keptCount++] = hand[i]
            condKept++
            processedMask |= 1 << i
          }
        }
      } else if (found) {
        continue
      }
    }

    let matchCount = 0
    for (let i = 0; i < handLen; i++) {
      if ((processedMask & (1 << i)) === 0 && matchesRule(hand[i], rule)) {
        MATCH_BUF[matchCount++] = i
        processedMask |= 1 << i
      }
    }
    if (matchCount === 0) continue

    if (limitType === 'all') {
      for (let k = 0; k < matchCount; k++) keptCardsBuf[keptCount++] = hand[MATCH_BUF[k]]
    } else if (limitType === 'at_most') {
      const quota = Number(limitCount) || 0
      if (quota <= 0) continue

      if (priorityModifier === 'prioritize_card' && priorityCard) {
        const pMax = Number(priorityCount) || 1
        let pCount = 0
        let ruleKept = 0

        // Pass 1: Keep prioritized card up to pMax and total quota
        for (let k = 0; k < matchCount && ruleKept < quota; k++) {
          const c = hand[MATCH_BUF[k]]
          if ((c.id === priorityCard || c.baseId === priorityCard) && pCount < pMax) {
            keptCardsBuf[keptCount++] = c
            pCount++
            ruleKept++
          }
        }
        // Pass 2: Fill remaining quota with other non-priority matching cards
        for (let k = 0; k < matchCount && ruleKept < quota; k++) {
          const c = hand[MATCH_BUF[k]]
          if (c.id !== priorityCard && c.baseId !== priorityCard) {
            keptCardsBuf[keptCount++] = c
            ruleKept++
          }
        }
        // Pass 3: Fill remaining quota with excess priority cards
        let seenPrio = 0
        for (let k = 0; k < matchCount && ruleKept < quota; k++) {
          const c = hand[MATCH_BUF[k]]
          if (c.id === priorityCard || c.baseId === priorityCard) {
            seenPrio++
            if (seenPrio > pMax) {
              keptCardsBuf[keptCount++] = c
              ruleKept++
            }
          }
        }
      } else if (priorityModifier === 'exclude_card' && priorityCard) {
        let ruleKept = 0
        for (let k = 0; k < matchCount && ruleKept < quota; k++) {
          const c = hand[MATCH_BUF[k]]
          if (c.id !== priorityCard && c.baseId !== priorityCard) {
            keptCardsBuf[keptCount++] = c
            ruleKept++
          }
        }
      } else {
        const keepLimit = Math.min(matchCount, quota)
        for (let k = 0; k < keepLimit; k++) {
          keptCardsBuf[keptCount++] = hand[MATCH_BUF[k]]
        }
      }
    }
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
  if (!Array.isArray(cardList) || cardList.length === 0) return null

  const expandedDeck = expandDeck(cardList)
  const totalDeckSize = expandedDeck.length
  if (totalDeckSize === 0) return null

  const handSize = Math.min(5, totalDeckSize)
  const numUnique = cardList.length

  const cardInitialHits = new Int32Array(numUnique)
  const cardFinalHits = new Int32Array(numUnique)

  const typeInitialHits = new Int32Array(3)
  const typeFinalHits = new Int32Array(3)
  const typeFinalCopies = new Int32Array(3)

  const levelInitialHits = new Int32Array(4)
  const levelFinalHits = new Int32Array(4)
  const levelFinalCopies = new Int32Array(4)

  const initTypeCounts = new Int32Array(3)
  const finalTypeCounts = new Int32Array(3)
  const initLevelCounts = new Int32Array(4)
  const finalLevelCounts = new Int32Array(4)

  let totalDiscardCount = 0
  let zeroCxFinalHands = 0
  let atLeastOneLvl0CharFinalHands = 0

  const indices = new Int16Array(totalDeckSize)
  const baseIndices = new Int16Array(totalDeckSize)
  for (let i = 0; i < totalDeckSize; i++) baseIndices[i] = i

  const initialHandBuf = new Array(handSize)
  const finalHandBuf = new Array(handSize)
  const keptCardsBuf = new Array(handSize)

  const updateHandStats = (hand, handLen, isFinal) => {
    const cardHits = isFinal ? cardFinalHits : cardInitialHits
    const typeCounts = isFinal ? finalTypeCounts : initTypeCounts
    const levelCounts = isFinal ? finalLevelCounts : initLevelCounts

    typeCounts.fill(0)
    levelCounts.fill(0)

    for (let i = 0; i < handLen; i++) {
      const c = hand[i]
      const idx = c.cardIdx
      if (idx !== undefined && idx >= 0 && idx < numUnique) {
        let isFirst = true
        for (let k = 0; k < i; k++) {
          if (hand[k].cardIdx === idx) {
            isFirst = false
            break
          }
        }
        if (isFirst) cardHits[idx]++
      }
      if (c.typeIdx >= 0) typeCounts[c.typeIdx]++
      if (c.normalizedLevel >= 0 && c.normalizedLevel <= 3) levelCounts[c.normalizedLevel]++
    }
  }

  for (let iter = 0; iter < iterations; iter++) {
    indices.set(baseIndices)

    for (let i = 0; i < handSize; i++) {
      const r = i + ((Math.random() * (totalDeckSize - i)) | 0)
      const temp = indices[i]
      indices[i] = indices[r]
      indices[r] = temp
      initialHandBuf[i] = expandedDeck[indices[i]]
    }

    updateHandStats(initialHandBuf, handSize, false)

    for (let t = 0; t < 3; t++) {
      const cnt = initTypeCounts[t]
      if (cnt > 0) {
        typeInitialHits[t]++
      }
    }
    for (let l = 0; l < 4; l++) {
      if (initLevelCounts[l] > 0) levelInitialHits[l]++
    }

    const keptCount = fastEvaluateMulligan(initialHandBuf, rules, keptCardsBuf)
    const discardCount = handSize - keptCount
    totalDiscardCount += discardCount

    let finalHandCount = 0
    for (let i = 0; i < keptCount; i++) finalHandBuf[finalHandCount++] = keptCardsBuf[i]

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

    updateHandStats(finalHandBuf, finalHandCount, true)

    for (let t = 0; t < 3; t++) {
      const cnt = finalTypeCounts[t]
      if (cnt > 0) typeFinalHits[t]++
      typeFinalCopies[t] += cnt
    }

    if (finalTypeCounts[2] === 0) zeroCxFinalHands++
    if (finalTypeCounts[0] > 0 && finalLevelCounts[0] > 0) {
      let hasLvl0Char = false
      for (let i = 0; i < finalHandCount; i++) {
        if (finalHandBuf[i].typeIdx === 0 && finalHandBuf[i].normalizedLevel === 0) {
          hasLvl0Char = true
          break
        }
      }
      if (hasLvl0Char) atLeastOneLvl0CharFinalHands++
    }

    for (let l = 0; l < 4; l++) {
      const cnt = finalLevelCounts[l]
      if (cnt > 0) levelFinalHits[l]++
      levelFinalCopies[l] += cnt
    }
  }

  const formatProb = (hits) => Number(((hits / iterations) * 100).toFixed(2))
  const formatAvg = (copies) => Number((copies / iterations).toFixed(2))

  const cardResults = cardList
    .map((card, idx) => {
      const initialProb = formatProb(cardInitialHits[idx])
      const finalProb = formatProb(cardFinalHits[idx])
      return {
        card,
        quantity: Number(card.quantity) || 1,
        initialProb,
        finalProb,
        deltaProb: Number((finalProb - initialProb).toFixed(2)),
      }
    })
    .sort((a, b) => b.finalProb - a.finalProb || b.quantity - a.quantity)

  const typeResults = CARD_TYPES.map((typeKey, t) => {
    const initialProb = formatProb(typeInitialHits[t])
    const finalProb = formatProb(typeFinalHits[t])
    return {
      type: typeKey,
      initialProb,
      finalProb,
      deltaProb: Number((finalProb - initialProb).toFixed(2)),
      avgCopies: formatAvg(typeFinalCopies[t]),
    }
  })

  const levelResults = LEVELS.map((lvl) => {
    const initialProb = formatProb(levelInitialHits[lvl])
    const finalProb = formatProb(levelFinalHits[lvl])
    return {
      level: lvl,
      initialProb,
      finalProb,
      deltaProb: Number((finalProb - initialProb).toFixed(2)),
      avgCopies: formatAvg(levelFinalCopies[lvl]),
    }
  })

  return {
    avgDiscardCount: formatAvg(totalDiscardCount),
    zeroCxProb: formatProb(zeroCxFinalHands),
    atLeastOneLvl0CharProb: formatProb(atLeastOneLvl0CharFinalHands),
    cardResults,
    typeResults,
    levelResults,
  }
}
