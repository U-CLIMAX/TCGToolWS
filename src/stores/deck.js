import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { findDeckSeriesId } from '@/utils/findDeckSeriesId'
import { deckRestrictions } from '@/maps/deck-restrictions'
import { seriesMap } from '@/maps/series-map'

// Pre-calculate ID to Prefixes map for efficient lookup
const idToPrefixes = Object.values(seriesMap).reduce((acc, series) => {
  acc[series.id] = series.prefixes
  return acc
}, {})

export const useDeckStore = defineStore(
  'deck',
  () => {
    // --- 狀態 (State) ---
    const version = ref(2)
    const cardsInDeck = ref({})
    const seriesId = ref('')
    const deckName = ref('')
    const coverCardId = ref('')
    const editingDeckKey = ref('')
    const deckHistory = ref([])
    const originalCardsInDeck = ref({})
    const savedDecks = ref({})
    const restrictionViolations = ref([])

    const authStore = useAuthStore()

    // --- 計算屬性 (Getters / Computed) ---
    const getCardCount = computed(() => {
      return (cardId) => cardsInDeck.value[cardId]?.quantity || 0
    })

    const totalCardCount = computed(() => {
      return Object.values(cardsInDeck.value).reduce((sum, item) => sum + item.quantity, 0)
    })

    // --- Helper Functions ---
    const checkRestrictions = () => {
      const cards = Object.values(cardsInDeck.value)
      const violations = new Map()
      const cardsBySeries = new Map()

      cards.forEach((card) => {
        const prefix = card.id.split('/')[0]
        if (!cardsBySeries.has(prefix)) {
          cardsBySeries.set(prefix, new Map())
        }
        const seriesCards = cardsBySeries.get(prefix)

        if (!seriesCards.has(card.name)) {
          seriesCards.set(card.name, [])
        }
        seriesCards.get(card.name).push(card)
      })

      Object.entries(deckRestrictions).forEach(
        ([sid, { banned = [], limited = [], choice = [] }]) => {
          const validPrefixes = idToPrefixes[sid] || []

          // 只處理相關 series 的卡片
          const relevantCards = new Map()
          validPrefixes.forEach((prefix) => {
            const seriesCards = cardsBySeries.get(prefix)
            if (seriesCards) {
              seriesCards.forEach((cards, name) => {
                if (!relevantCards.has(name)) {
                  relevantCards.set(name, [])
                }
                relevantCards.get(name).push(...cards)
              })
            }
          })

          // Banned 檢查
          banned.forEach((name) => {
            const matches = relevantCards.get(name)
            if (matches && matches.length > 0) {
              const card = matches[0]
              violations.set(`banned:${name}`, {
                type: 'banned',
                cardName: name,
                card: { id: card.id, cardIdPrefix: card.cardIdPrefix },
              })
            }
          })

          // Limited 檢查
          limited.forEach(({ cardName, limit }) => {
            const matches = relevantCards.get(cardName)
            if (matches) {
              const quantity = matches.reduce((sum, c) => sum + c.quantity, 0)
              if (quantity > limit) {
                violations.set(`limited:${cardName}`, {
                  type: 'limited',
                  cardName,
                  limit,
                  card: {
                    id: matches[0].id,
                    cardIdPrefix: matches[0].cardIdPrefix,
                    quantity,
                  },
                })
              }
            }
          })

          // Choice 檢查
          choice.forEach((list) => {
            const foundItems = []

            list.forEach((name) => {
              const matches = relevantCards.get(name)
              if (matches && matches.length > 0) {
                foundItems.push({ name, card: matches[0] })
              }
            })

            if (foundItems.length > 1) {
              foundItems.sort((a, b) => a.name.localeCompare(b.name))

              violations.set(`choice:${foundItems.map((item) => item.name).join('|')}`, {
                type: 'choice',
                choices: foundItems.map((item) => item.name),
                found: foundItems.map((item) => ({
                  id: item.card.id,
                  cardIdPrefix: item.card.cardIdPrefix,
                })),
              })
            }
          })
        }
      )

      restrictionViolations.value = Array.from(violations.values())
    }

    // --- 同步操作 (Actions) ---
    const addCard = (card) => {
      const cardId = card.id
      if (cardsInDeck.value[cardId]) {
        cardsInDeck.value[cardId].quantity++
      } else {
        cardsInDeck.value[cardId] = {
          id: cardId,
          cardIdPrefix: card.cardIdPrefix,
          product_name: card.product_name,
          name: card.name,
          level: card.level,
          color: card.color,
          cost: card.cost,
          type: card.type,
          quantity: 1,
        }
      }
      checkRestrictions()
      return true
    }

    const removeCard = (cardId) => {
      if (!cardsInDeck.value[cardId]) return

      const cardInDeck = cardsInDeck.value[cardId]
      cardInDeck.quantity--

      if (cardInDeck.quantity <= 0) {
        delete cardsInDeck.value[cardId]
      }
      checkRestrictions()
    }

    const clearDeck = () => {
      cardsInDeck.value = {}
      checkRestrictions()
    }

    const setEditingDeck = (deck, key) => {
      // Deep copy for diffing later
      originalCardsInDeck.value = JSON.parse(JSON.stringify(deck.cards))
      cardsInDeck.value = deck.cards
      seriesId.value = deck.seriesId
      deckName.value = deck.name
      coverCardId.value = deck.coverCardId
      deckHistory.value = deck.history || []
      editingDeckKey.value = key
      checkRestrictions()
    }

    const clearEditingDeck = () => {
      deckName.value = ''
      coverCardId.value = ''
      editingDeckKey.value = ''
      deckHistory.value = []
      originalCardsInDeck.value = {}
    }

    const updateDominantSeriesId = () => {
      const currentCardIds = Object.keys(cardsInDeck.value)
      seriesId.value = findDeckSeriesId(currentCardIds)
    }

    // --- 非同步操作 (Async Actions) ---

    /**
     * 保存卡组。如果API调用失败，将抛出一个错误。
     */
    const saveEncodedDeck = async (key, compressedData, isSharedDeck = false) => {
      if (!authStore.token) {
        throw new Error('请先登入')
      }

      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({ key, deckData: compressedData }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '保存卡组失败')
      }

      savedDecks.value[key] = compressedData
      if (!isSharedDeck) {
        cardsInDeck.value = {}
      }
    }

    /**
     * 更新现有卡组。
     */
    const updateEncodedDeck = async (key, compressedData) => {
      if (!authStore.token) {
        throw new Error('请先登入')
      }

      const response = await fetch(`/api/decks/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({ deckData: compressedData }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '更新卡组失败')
      }

      savedDecks.value[key] = compressedData
    }

    /**
     * 获取用户的所有卡组。
     */
    const fetchDecks = async () => {
      if (!authStore.token) {
        throw new Error('请先登入')
      }

      const response = await fetch('/api/decks', {
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '获取卡组列表失败')
      }

      const decks = await response.json()
      decks.sort((a, b) => b.updated_at - a.updated_at)

      savedDecks.value = decks.reduce((acc, deck) => {
        acc[deck.key] = deck.deck_data
        return acc
      }, {})
    }

    /**
     * 获取一个公开分享的卡组。
     */
    const fetchDeckByKey = async (key) => {
      const response = await fetch(`/api/shared-decks/${key}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '获取卡组失败')
      }

      return await response.json()
    }

    /**
     * 從後端獲取 Decklog 的 JSON 資料
     */
    const fetchDecklog = async (key) => {
      const response = await fetch(`/api/decklog/${key}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '获取 Decklog 资料失败')
      }

      const payload = await response.json()

      return payload.data
    }

    /**
     * 删除一个卡组。
     */
    const deleteDeck = async (key) => {
      if (!authStore.token) {
        throw new Error('请先登入')
      }

      const response = await fetch(`/api/decks/${key}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '删除卡组失败')
      }

      savedDecks.value = { ...savedDecks.value }
      delete savedDecks.value[key]

      if (editingDeckKey.value === key) {
        clearDeck()
        clearEditingDeck()
      }
    }

    const reset = () => {
      cardsInDeck.value = {}
      seriesId.value = ''
      deckName.value = ''
      coverCardId.value = ''
      editingDeckKey.value = ''
      savedDecks.value = {}
    }

    return {
      version,
      cardsInDeck,
      getCardCount,
      totalCardCount,
      seriesId,
      deckName,
      coverCardId,
      editingDeckKey,
      deckHistory,
      originalCardsInDeck,
      addCard,
      removeCard,
      clearDeck,
      setEditingDeck,
      clearEditingDeck,
      updateDominantSeriesId,
      savedDecks,
      saveEncodedDeck,
      updateEncodedDeck,
      fetchDecks,
      fetchDeckByKey,
      deleteDeck,
      reset,
      fetchDecklog,
      restrictionViolations,
      checkRestrictions,
    }
  },
  {
    persist: {
      storage: localStorage,
    },
  }
)
