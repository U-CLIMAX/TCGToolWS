const SORT_ORDER = {
  type: { 事件卡: 1, 高潮卡: 2, default: 0 },
  color: { 红色: 1, 黄色: 2, 绿色: 3, 蓝色: 4, default: 99 },
}

const getSortValue = (card) => {
  const typeOrder = SORT_ORDER.type[card.type] ?? SORT_ORDER.type.default
  const colorOrder = SORT_ORDER.color[card.color] ?? SORT_ORDER.color.default

  // 將 '-' 視為 0
  const level = card.level === '-' ? 0 : parseInt(card.level, 10) || 0

  return {
    type: typeOrder,
    level: level,
    color: colorOrder,
    id: card.id,
  }
}

export const sortDeckCards = (cardList) => {
  if (!cardList || cardList.length === 0) {
    return []
  }

  return [...cardList].sort((a, b) => {
    const sortA = getSortValue(a)
    const sortB = getSortValue(b)

    return (
      sortA.type - sortB.type ||
      sortA.level - sortB.level ||
      sortA.color - sortB.color ||
      sortA.id.localeCompare(sortB.id)
    )
  })
}
