import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useAuthStore } from './auth'
import { seriesMap } from '@/maps/series-map'

export const useDecksGalleryStore = defineStore('decksGallery', () => {
  const authStore = useAuthStore()

  // State
  const decks = ref([])
  const userDeckCount = ref(0)
  const isLoading = ref(false)
  const filters = reactive({
    source: 'all', // 'all' or 'mine'
    seriesId: null,
    sort: 'newest', // Only 'newest' for now as per requirement
  })

  const pagination = reactive({
    cursor: null,
    hasMore: true,
    limit: 20,
  })

  // Options
  const seriesOptions = Object.entries(seriesMap).map(([title, info]) => ({
    title,
    value: info.id,
  }))

  const fetchDecks = async (isLoadMore = false) => {
    if (isLoading.value) return
    isLoading.value = true

    try {
      if (!isLoadMore) {
        pagination.cursor = null
        pagination.hasMore = true
        decks.value = []
      }

      const params = new URLSearchParams()
      params.append('limit', pagination.limit.toString())
      if (filters.seriesId) params.append('series', filters.seriesId)
      if (filters.sort) params.append('sort', filters.sort)
      if (pagination.cursor) params.append('cursor', pagination.cursor)

      const endpoint = filters.source === 'mine' ? '/api/gallery/my-decks' : '/api/gallery/decks'

      const headers = {}
      if (filters.source === 'mine' && authStore.token) {
        headers['Authorization'] = `Bearer ${authStore.token}`
      }

      const response = await fetch(`${endpoint}?${params.toString()}`, { headers })

      if (!response.ok) {
        throw new Error('获取广场卡组失败')
      }

      const data = await response.json()

      if (filters.source === 'mine') {
        await fetchUserDeckCount()
      }

      if (isLoadMore) {
        decks.value.push(...data.decks)
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

  const fetchUserDeckCount = async () => {
    if (!authStore.token) return

    try {
      const response = await fetch('/api/gallery/my-count', {
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
      })
      if (!response.ok) throw new Error('获取广场分享数量失败')
      const data = await response.json()
      userDeckCount.value = data.count
    } catch (error) {
      console.error(error)
    }
  }

  const deleteDeck = async (key) => {
    if (!authStore.token) throw new Error('请先登入')

    const response = await fetch(`/api/gallery/decks/${key}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || '删除失败')
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
    fetchDecks,
    fetchUserDeckCount,
    deleteDeck,
  }
})
