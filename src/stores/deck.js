import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { findDeckSeriesId } from '@/utils/findDeckSeriesId'
import { deckRestrictions } from '@/maps/deck-restrictions'

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

      const addViolation = (key, data) => {
        if (!violations.has(key)) {
          violations.set(key, data)
        }
      }

      const checkBanned = (banned) => {
        banned.forEach((obj) => {
          const [cardName, restrictedIds] = Object.entries(obj)[0]
          const card = cards.find((c) => restrictedIds.includes(c.id))

          if (card) {
            addViolation(`banned:${cardName}`, {
              type: 'banned',
              cardName,
              card: {
                id: card.id,
                cardIdPrefix: card.cardIdPrefix,
              },
            })
          }
        })
      }

      const checkLimited = (limited) => {
        limited.forEach(({ cardName, cardId, limit }) => {
          const matches = cards.filter((c) => cardId.includes(c.id))
          const quantity = matches.reduce((sum, c) => sum + c.quantity, 0)

          if (quantity > limit) {
            addViolation(`limited:${cardName}`, {
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
        })
      }

      const checkChoice = (choice) => {
        choice.forEach((list) => {
          const foundCardsList = list
            .map((obj) => {
              const [cardName, restrictedIds] = Object.entries(obj)[0]
              const match = cards.find((c) => restrictedIds.includes(c.id))
              return match ? { ...match, name: cardName } : null
            })
            .filter(Boolean)

          if (foundCardsList.length > 1) {
            foundCardsList.sort((a, b) => a.name.localeCompare(b.name))

            const choices = foundCardsList.map((c) => c.name)
            const found = foundCardsList.map((c) => ({
              id: c.id,
              name: c.name,
              cardIdPrefix: c.cardIdPrefix,
            }))

            addViolation(`choice:${choices.join('|')}`, {
              type: 'choice',
              choices,
              found,
            })
          }
        })
      }

      Object.values(deckRestrictions).forEach((restrictions) => {
        const { banned = [], limited = [], choice = [] } = restrictions

        checkBanned(banned)
        checkLimited(limited)
        checkChoice(choice)
      })

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
          level: card.level,
          color: card.color,
          cost: card.cost,
          type: card.type,
          quantity: 1,
        }
      }

      if (coverCardId.value === '') {
        coverCardId.value = { id: card.id, cardIdPrefix: card.cardIdPrefix }
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
      deckName.value = ''
      coverCardId.value = ''
      editingDeckKey.value = ''
      deckHistory.value = []
      originalCardsInDeck.value = {}
      cardsInDeck.value = {}
      checkRestrictions()
    }

    const setEditingDeck = (deck, key) => {
      // Deep copy for diffing later
      originalCardsInDeck.value = JSON.parse(JSON.stringify(deck.deckData))
      cardsInDeck.value = deck.deckData
      seriesId.value = deck.seriesId
      deckName.value = deck.name
      coverCardId.value = deck.coverCardId
      deckHistory.value = deck.history || []
      editingDeckKey.value = key
      checkRestrictions()
    }

    const updateDominantSeriesId = () => {
      const currentCardIds = Object.keys(cardsInDeck.value)
      seriesId.value = findDeckSeriesId(currentCardIds)
    }

    // --- 非同步操作 (Async Actions) ---

    /**
     * 保存卡组。如果API调用失败，将抛出一个错误。
     */
    const saveEncodedDeck = async (
      key,
      deckData,
      { name, seriesId, coverCardId, history = [], isDeckGallery = false, climaxCardsId = [] }
    ) => {
      if (!authStore.token) {
        throw new Error('请先登入')
      }

      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({
          key,
          deckData,
          name,
          seriesId,
          coverCardId,
          history,
          isDeckGallery,
          climaxCardsId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '保存卡组失败')
      }

      if (!isDeckGallery) {
        savedDecks.value[key] = {
          deckData,
          name,
          seriesId,
          coverCardId,
          history,
          updated_at: Math.floor(Date.now() / 1000),
        }
      }
    }

    /**
     * 更新现有卡组。
     */
    const updateEncodedDeck = async (
      key,
      deckData,
      { name, seriesId, coverCardId, history = [] }
    ) => {
      if (!authStore.token) {
        throw new Error('请先登入')
      }

      const response = await fetch(`/api/decks/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({
          deckData,
          name,
          seriesId,
          coverCardId,
          history,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '更新卡组失败')
      }

      savedDecks.value[key] = {
        deckData,
        name,
        seriesId,
        coverCardId,
        history,
        updated_at: Math.floor(Date.now() / 1000),
      }
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
        acc[deck.key] = {
          deckData: deck.deck_data,
          name: deck.deck_name,
          seriesId: deck.series_id,
          coverCardId: deck.cover_cards_id,
          history: deck.history,
          updated_at: deck.updated_at,
        }
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
