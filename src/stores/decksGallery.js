import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from './auth'
import { ALL_SERIES_OPTIONS } from '@/maps/series-map'

export const useDecksGalleryStore = defineStore('decksGallery', () => {
  const authStore = useAuthStore()

  // --- State ---
  const decks = ref([])
  const userDeckCount = ref(0)
  const isLoading = ref(false)
  const filters = reactive({
    source: 'all', // 'all' or 'mine'
    gameType: 'ws',
    seriesId: null,
    sort: 'newest',
    tournamentType: null,
    participantCount: null,
    placement: null,
  })

  const pagination = reactive({
    cursor: null,
    hasMore: true,
    limit: 20,
  })

  // --- Computed ---
  const seriesOptions = computed(() => {
    return ALL_SERIES_OPTIONS.filter((opt) => opt.game === filters.gameType)
  })

  // --- Actions ---

  /**
   * Fetches decks for the gallery based on active filters and pagination
   * @param {boolean} isLoadMore - Whether to append results to existing list
   */
  const fetchDecks = async (isLoadMore = false) => {
    if (!isLoadMore) {
      pagination.cursor = null
      pagination.hasMore = true
      decks.value = []
    }

    if (isLoading.value) return
    if (isLoadMore && !pagination.hasMore) return

    isLoading.value = true

    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        game_type: filters.gameType,
        sort: filters.sort || 'newest',
      })

      if (filters.seriesId) params.append('series', filters.seriesId)
      if (filters.tournamentType) params.append('tournament_type', filters.tournamentType)
      if (filters.participantCount) params.append('participant_count', filters.participantCount)
      if (filters.placement) params.append('placement', filters.placement)
      if (pagination.cursor) params.append('cursor', pagination.cursor)

      const headers = {}
      if (authStore.isAuthenticated) {
        headers['Authorization'] = `Bearer ${authStore.token}`
      }

      const endpoint = filters.source === 'mine' ? '/api/gallery/my-decks' : '/api/gallery/decks'
      const response = await fetch(`${endpoint}?${params.toString()}`, { headers })

      if (!response.ok) throw new Error('获取广场卡组失败')

      const data = await response.json()

      if (filters.source === 'mine') {
        await fetchUserDeckCount()
      }

      if (isLoadMore) {
        decks.value = [...decks.value, ...data.decks]
      } else {
        decks.value = data.decks
      }

      pagination.cursor = data.nextCursor
      pagination.hasMore = !!data.nextCursor
    } catch (error) {
      console.error('Fetch gallery decks error:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetches the total number of gallery shares for the current user
   */
  const fetchUserDeckCount = async () => {
    if (!authStore.isAuthenticated) return

    try {
      const response = await fetch('/api/gallery/my-count', {
        headers: { Authorization: `Bearer ${authStore.token}` },
      })
      if (!response.ok) throw new Error('获取广场分享数量失败')
      const data = await response.json()
      userDeckCount.value = data.count
    } catch (error) {
      console.error('Fetch user deck count error:', error)
    }
  }

  /**
   * Submits a rating for a specific deck
   * @param {string} key
   * @param {number} rating
   */
  const rateDeck = async (key, rating) => {
    if (!authStore.isAuthenticated) throw new Error('请先登录')

    const response = await fetch(`/api/gallery/decks/${key}/rating`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ rating }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || '评分失败')
    }

    return await response.json()
  }

  /**
   * Fetches the current user's rating for a specific deck
   * @param {string} key
   */
  const fetchMyRating = async (key) => {
    if (!authStore.isAuthenticated) return 0

    const response = await fetch(`/api/gallery/decks/${key}/rating`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })

    if (!response.ok) return 0
    const data = await response.json()
    return data.rating
  }

  /**
   * Deletes a gallery share by deck key
   * @param {string} key
   */
  const deleteDeck = async (key) => {
    if (!authStore.isAuthenticated) throw new Error('请先登录')

    const response = await fetch(`/api/gallery/decks/${key}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || '删除分享失败')
    }

    decks.value = decks.value.filter((d) => d.key !== key)
    await fetchUserDeckCount()
  }

  return {
    decks,
    userDeckCount,
    isLoading,
    filters,
    pagination,
    seriesOptions,
    allSeriesOptions: ALL_SERIES_OPTIONS,
    fetchDecks,
    fetchUserDeckCount,
    deleteDeck,
    rateDeck,
    fetchMyRating,
  }
})
