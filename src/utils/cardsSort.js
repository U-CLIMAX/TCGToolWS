const SORT_ORDER = {
  type: { 事件卡: 1, 高潮卡: 2, default: 0 },
  color: { 红色: 1, 黄色: 2, 绿色: 3, 蓝色: 4, default: 99 },
}

const getSortValue = (card) => {
  const typeOrder = SORT_ORDER.type[card.type] ?? SORT_ORDER.type.default
  const colorOrder = SORT_ORDER.color[card.color] ?? SORT_ORDER.color.default
  const level = card.level === '-' ? 0 : parseInt(card.level, 10) || 0

  return {
    type: typeOrder,
    level: level,
    color: colorOrder,
    id: card.id,
    baseId: card.baseId,
  }
}

export const sortCards = (cardList) => {
  if (!cardList?.length) return []

  return [...cardList].sort((a, b) => {
    const sA = getSortValue(a)
    const sB = getSortValue(b)

    return (
      sA.type - sB.type ||
      sA.level - sB.level ||
      sA.color - sB.color ||
      sA.baseId.localeCompare(sB.baseId) ||
      sA.id.length - sB.id.length
    )
  })
}
