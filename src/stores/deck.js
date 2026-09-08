import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import { useAuthStore } from './auth'
import { findDeckSeriesId } from '@/utils/findDeckSeriesId'
import { deckRestrictions } from '@/maps/deck-restrictions'
import { hasSensitiveWords } from '@/utils/sensitiveWords'
import { apiFetch } from '@/utils/api.js'

export const useDeckStore = defineStore(
  'deck',
  () => {
    // --- State ---
    const version = ref(2)
    const cardsInDeck = ref({})
    const seriesId = ref('')
    const deckName = ref('')
    const coverCardId = ref('')
    const editingDeckKey = ref('')
    const deckHistory = shallowRef([])
    const originalCardsInDeck = shallowRef({})
    const savedDecks = ref({})
    const localDecks = ref({})
    const restrictionViolations = shallowRef([])

    const decks = ref([])
    const pagination = ref({
      cursor: null,
      hasMore: true,
      limit: 24,
    })
    const filters = ref({
      gameType: 'ws',
      search: '',
      series: null,
      tags: [],
    })
    const meta = ref({
      seriesCounts: {},
      allTags: [],
      gameTypeCounts: {},
      totalCount: 0,
    })
    const isLoading = ref(false)
    const shouldResetView = ref(false)
    const pendingGameType = ref(null)
    let currentFetchController = null

    const authStore = useAuthStore()

    // --- Helper Getters ---
    const getCardCount = (cardId) => {
      return cardsInDeck.value[cardId]?.quantity || 0
    }

    const totalCardCount = computed(() => {
      return Object.values(cardsInDeck.value).reduce((sum, item) => sum + item.quantity, 0)
    })

    const localDecksList = computed(() => {
      return Object.entries(localDecks.value)
        .map(([key, deck]) => ({
          key,
          name: deck.name,
          seriesId: deck.seriesId,
          game_type: deck.game_type,
          coverCardId: deck.coverCardId,
          tags: deck.tags || [],
          updated_at: deck.updated_at,
          isLocal: true,
        }))
        .sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0))
    })

    // --- Helper Functions ---
    /**
     * Validates deck against card restrictions (banned, limited, choice).
     */
    const checkRestrictions = () => {
      const cards = Object.values(cardsInDeck.value)
      const violations = new Map()

      const addViolation = (key, data) => {
        if (!violations.has(key)) {
          violations.set(key, { id: key, ...data })
        }
      }

      const checkBanned = (banned) => {
        banned.forEach(({ cardName, cardId, desc }) => {
          const card = cards.find((c) => cardId.includes(c.id))

          if (card) {
            addViolation(`banned:${cardName}`, {
              type: 'banned',
              cardName,
              desc,
              card: {
                id: card.id,
                cardIdPrefix: card.cardIdPrefix,
              },
            })
          }
        })
      }

      const checkLimited = (limited) => {
        limited.forEach(({ cardName, cardId, limit, desc }) => {
          const matches = cards.filter((c) => cardId.includes(c.id))
          const quantity = matches.reduce((sum, c) => sum + c.quantity, 0)

          if (quantity > limit) {
            addViolation(`limited:${cardName}`, {
              type: 'limited',
              cardName,
              limit,
              desc,
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
            .map(({ cardName, cardId, desc }) => {
              const match = cards.find((c) => cardId.includes(c.id))
              return match ? { ...match, name: cardName, desc } : null
            })
            .filter(Boolean)

          if (foundCardsList.length > 1) {
            foundCardsList.sort((a, b) => a.name.localeCompare(b.name))

            const choices = foundCardsList.map((c) => c.name)
            // Retrieve desc from the first matched rule that has one (or combine them)
            const desc = foundCardsList.find((c) => c.desc)?.desc
            const found = foundCardsList.map((c) => ({
              id: c.id,
              name: c.name,
              cardIdPrefix: c.cardIdPrefix,
            }))

            addViolation(`choice:${choices.join('|')}`, {
              type: 'choice',
              choices,
              desc,
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

    // --- Actions ---
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
        if (cardId === coverCardId.value?.id) coverCardId.value = ''
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
      const currentCardIdPrefixes = Object.values(cardsInDeck.value).map(
        (card) => card.cardIdPrefix
      )
      seriesId.value = findDeckSeriesId(currentCardIdPrefixes)
    }

    // --- Local Decks Actions (100% 離線可用) ---

    /**
     * Saves or updates a local deck (Offline)
     */
    const saveLocalDeck = (
      key,
      deckData,
      { name, seriesId, game_type = 'ws', coverCardId, history = [], tags = [] } = {}
    ) => {
      const now = Math.floor(Date.now() / 1000)
      const existing = localDecks.value[key] || {}
      localDecks.value = {
        ...localDecks.value,
        [key]: {
          ...existing,
          deckData,
          name: name || existing.name || '未命名本地卡组',
          seriesId: seriesId || existing.seriesId,
          game_type: game_type || existing.game_type || 'ws',
          coverCardId: coverCardId || existing.coverCardId,
          history: history.length > 0 ? history : existing.history || [],
          tags: tags.length > 0 ? tags : existing.tags || [],
          updated_at: now,
          isLocal: true,
        },
      }
    }

    /**
     * Updates only the tags of an existing local deck
     */
    const updateLocalDeckTags = (key, tags) => {
      if (localDecks.value[key]) {
        localDecks.value = {
          ...localDecks.value,
          [key]: {
            ...localDecks.value[key],
            tags: Array.isArray(tags) ? tags : [],
            updated_at: Math.floor(Date.now() / 1000),
          },
        }
      }
    }

    /**
     * Deletes a local deck
     */
    const deleteLocalDeck = (key) => {
      if (localDecks.value[key]) {
        const copy = { ...localDecks.value }
        delete copy[key]
        localDecks.value = copy
      }
      if (editingDeckKey.value === key) {
        clearDeck()
      }
    }

    /**
     * Uploads a local deck to the Cloud (D1) and removes it from local upon success
     */
    const uploadLocalDeckToCloud = async (key) => {
      const localDeck = localDecks.value[key]
      if (!localDeck) throw new Error('未找到本地卡组')
      if (!authStore.isOnline) throw new Error('网络连接不可用，请检查网络状态')
      if (!authStore.token) throw new Error('请先登录后再上传至云端')

      await saveEncodedDeck(key, localDeck.deckData, {
        name: localDeck.name,
        seriesId: localDeck.seriesId,
        game_type: localDeck.game_type,
        coverCardId: localDeck.coverCardId,
        history: localDeck.history || [],
        tags: localDeck.tags || [],
      })

      // 上传成功后从本地移除
      deleteLocalDeck(key)
    }

    // --- Async Actions ---

    /**
     * Saves encoded deck to database.
     */
    const saveEncodedDeck = async (
      key,
      deckData,
      {
        name,
        seriesId,
        game_type,
        coverCardId,
        history = [],
        isDeckGallery = false,
        climaxCardsId = [],
        tournamentType = null,
        participantCount = null,
        placement = null,
        articleLink = null,
        tags = [],
      } = {}
    ) => {
      if (!authStore.token) throw new Error('请先登录')

      if (await hasSensitiveWords(name)) throw new Error('检测到敏感词！')

      const response = await apiFetch('/api/decks', {
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
          game_type,
          coverCardId,
          history,
          isDeckGallery,
          climaxCardsId,
          tournamentType,
          participantCount,
          placement,
          articleLink,
          tags,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '保存卡组失败')
      }

      if (!isDeckGallery) {
        const now = Math.floor(Date.now() / 1000)
        savedDecks.value[key] = {
          deckData,
          name,
          seriesId,
          game_type,
          coverCardId,
          history,
          tags,
          updated_at: now,
        }
        // Prepend to listing array
        decks.value = [
          {
            key,
            name,
            seriesId,
            game_type,
            coverCardId,
            tags,
            updated_at: now,
          },
          ...decks.value,
        ]
        // Increment metadata counts
        meta.value.totalCount++
        meta.value.gameTypeCounts[game_type] = (meta.value.gameTypeCounts[game_type] || 0) + 1
        meta.value.seriesCounts[seriesId] = (meta.value.seriesCounts[seriesId] || 0) + 1
        // Add new tags to meta.allTags
        tags.forEach((tag) => {
          if (!meta.value.allTags.includes(tag)) {
            meta.value.allTags.push(tag)
          }
        })
        meta.value.allTags.sort()

        shouldResetView.value = true
        pendingGameType.value = game_type
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('decksViewState')
        }
      }
    }

    /**
     * Updates an existing encoded deck.
     */
    const updateEncodedDeck = async (
      key,
      deckData,
      { name, seriesId, game_type, coverCardId, history = [], tags = [] } = {}
    ) => {
      if (!authStore.token) throw new Error('请先登录')

      if (await hasSensitiveWords(name)) throw new Error('检测到敏感词！')

      const response = await apiFetch(`/api/decks/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({
          deckData,
          name,
          seriesId,
          game_type,
          coverCardId,
          history,
          tags,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '更新卡组失败')
      }

      const now = Math.floor(Date.now() / 1000)
      savedDecks.value[key] = {
        deckData,
        name,
        seriesId,
        game_type,
        coverCardId,
        history,
        tags,
        updated_at: now,
      }

      // Update in decks list array
      const index = decks.value.findIndex((d) => d.key === key)
      if (index !== -1) {
        const oldDeck = decks.value[index]
        if (oldDeck.seriesId !== seriesId) {
          if (meta.value.seriesCounts[oldDeck.seriesId]) meta.value.seriesCounts[oldDeck.seriesId]--
          meta.value.seriesCounts[seriesId] = (meta.value.seriesCounts[seriesId] || 0) + 1
        }
        if (oldDeck.game_type !== game_type) {
          if (meta.value.gameTypeCounts[oldDeck.game_type])
            meta.value.gameTypeCounts[oldDeck.game_type]--
          meta.value.gameTypeCounts[game_type] = (meta.value.gameTypeCounts[game_type] || 0) + 1
        }

        decks.value[index] = {
          key,
          name: name,
          seriesId: seriesId,
          game_type,
          coverCardId: coverCardId,
          tags,
          updated_at: now,
        }
      }

      // Add new tags to meta.allTags
      tags.forEach((tag) => {
        if (!meta.value.allTags.includes(tag)) {
          meta.value.allTags.push(tag)
        }
      })
      meta.value.allTags.sort()

      shouldResetView.value = true
      pendingGameType.value = game_type
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('decksViewState')
      }
    }

    /**
     * Fetches paginated decks for the current user based on active filters.
     * @param {boolean} isLoadMore - Whether to append results to the existing list
     */
    const fetchDecks = async (isLoadMore = false) => {
      if (!authStore.token) throw new Error('请先登录')

      if (isLoadMore) {
        if (isLoading.value || !pagination.value.hasMore) return
      } else {
        if (currentFetchController) {
          currentFetchController.abort()
        }
        pagination.value.cursor = null
        pagination.value.hasMore = true
        decks.value = []
      }

      currentFetchController = new AbortController()
      const { signal } = currentFetchController
      isLoading.value = true

      try {
        const params = new URLSearchParams({
          limit: pagination.value.limit.toString(),
          game_type: filters.value.gameType,
        })

        if (filters.value.search) params.append('search', filters.value.search)
        if (filters.value.series) params.append('series', filters.value.series)
        if (filters.value.tags && filters.value.tags.length > 0) {
          params.append('tags', JSON.stringify(filters.value.tags))
        }
        if (pagination.value.cursor) {
          params.append('cursor', pagination.value.cursor)
        }

        const response = await apiFetch(`/api/decks?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || '获取卡组列表失败')
        }

        const data = await response.json()

        const mappedDecks = data.decks.map((deck) => ({
          key: deck.key,
          name: deck.deck_name,
          seriesId: deck.series_id,
          game_type: deck.game_type,
          coverCardId: deck.cover_cards_id,
          tags: deck.tags || [],
          updated_at: deck.updated_at,
        }))

        if (isLoadMore) {
          decks.value = [...decks.value, ...mappedDecks]
        } else {
          decks.value = mappedDecks
        }

        pagination.value.cursor = data.nextCursor
        pagination.value.hasMore = !!data.nextCursor

        // Sync metadata cache for single decks
        data.decks.forEach((deck) => {
          if (!savedDecks.value[deck.key]) {
            savedDecks.value[deck.key] = {
              deckData: null,
              name: deck.deck_name,
              seriesId: deck.series_id,
              game_type: deck.game_type,
              coverCardId: deck.cover_cards_id,
              history: null,
              tags: deck.tags || [],
              updated_at: deck.updated_at,
            }
          } else {
            savedDecks.value[deck.key] = {
              ...savedDecks.value[deck.key],
              name: deck.deck_name,
              seriesId: deck.series_id,
              game_type: deck.game_type,
              coverCardId: deck.cover_cards_id,
              tags: deck.tags || [],
              updated_at: deck.updated_at,
            }
          }
        })
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }
        throw error
      } finally {
        if (currentFetchController?.signal === signal) {
          isLoading.value = false
        }
      }
    }

    /**
     * Fetches metadata summary for filters.
     */
    const fetchDecksMeta = async () => {
      if (!authStore.token) throw new Error('请先登录')

      const response = await apiFetch('/api/decks/meta', {
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '获取卡组汇总失败')
      }

      const data = await response.json()
      meta.value = {
        seriesCounts: data.seriesCounts || {},
        allTags: data.allTags || [],
        gameTypeCounts: data.gameTypeCounts || {},
        totalCount: data.totalCount || 0,
      }
    }

    /**
     * Updates only the tags of a deck.
     */
    const updateDeckTags = async (key, tags) => {
      if (!authStore.token) throw new Error('请先登录')

      const response = await apiFetch(`/api/decks/${key}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({ tags }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '更新标签失败')
      }

      if (savedDecks.value[key]) {
        savedDecks.value[key].tags = tags
      }

      // Update in decks list array
      const deckInList = decks.value.find((d) => d.key === key)
      if (deckInList) {
        deckInList.tags = tags
      }

      // Add new tags to meta.allTags
      tags.forEach((tag) => {
        if (!meta.value.allTags.includes(tag)) {
          meta.value.allTags.push(tag)
        }
      })
      meta.value.allTags.sort()
    }

    /**
     * Fetches a publicly shared deck by key.
     */
    const fetchDeckByKey = async (key) => {
      const response = await apiFetch(`/api/shared-decks/${key}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '获取卡组失败')
      }

      return await response.json()
    }

    /**
     * Fetches Decklog JSON data from backend.
     */
    const fetchDecklog = async (key) => {
      const response = await apiFetch(`/api/decklog/${key}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '获取 Decklog 资料失败')
      }

      const payload = await response.json()
      return payload.data
    }

    /**
     * Deletes a deck by key.
     */
    const deleteDeck = async (key) => {
      if (!authStore.token) throw new Error('请先登录')

      const response = await apiFetch(`/api/decks/${key}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '删除卡组失败')
      }

      // Adjust meta counts
      const oldDeck = savedDecks.value[key]
      if (oldDeck) {
        meta.value.totalCount = Math.max(0, meta.value.totalCount - 1)
        if (oldDeck.game_type && meta.value.gameTypeCounts[oldDeck.game_type]) {
          meta.value.gameTypeCounts[oldDeck.game_type] = Math.max(
            0,
            meta.value.gameTypeCounts[oldDeck.game_type] - 1
          )
        }
        if (oldDeck.seriesId && meta.value.seriesCounts[oldDeck.seriesId]) {
          meta.value.seriesCounts[oldDeck.seriesId] = Math.max(
            0,
            meta.value.seriesCounts[oldDeck.seriesId] - 1
          )
        }
      }

      savedDecks.value = { ...savedDecks.value }
      delete savedDecks.value[key]

      // Remove from decks list array
      decks.value = decks.value.filter((d) => d.key !== key)

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
      decks.value = []
      pagination.value = { cursor: null, hasMore: true, limit: 24 }
      filters.value = { gameType: 'ws', search: '', series: null, tags: [] }
      meta.value = { seriesCounts: {}, allTags: [], gameTypeCounts: {}, totalCount: 0 }
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
      fetchDecksMeta,
      fetchDeckByKey,
      deleteDeck,
      updateDeckTags,
      reset,
      fetchDecklog,
      restrictionViolations,
      checkRestrictions,
      localDecks,
      localDecksList,
      saveLocalDeck,
      updateLocalDeckTags,
      deleteLocalDeck,
      uploadLocalDeckToCloud,
      decks,
      pagination,
      filters,
      meta,
      isLoading,
      shouldResetView,
      pendingGameType,
    }
  },
  {
    persist: {
      storage: localStorage,
      pick: [
        'version',
        'cardsInDeck',
        'seriesId',
        'deckName',
        'coverCardId',
        'editingDeckKey',
        'deckHistory',
        'originalCardsInDeck',
        'restrictionViolations',
        'localDecks',
      ],
    },
  }
)
