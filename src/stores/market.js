import { defineStore } from 'pinia'
import { ref, shallowRef, reactive, computed } from 'vue'
import { useAuthStore } from './auth'
import { ALL_SERIES_OPTIONS } from '@/maps/series-map'

/**
 * Constants for climax types and icons
 */
const CLIMAX_TYPE_OPTIONS = [
  { name: '爆', value: 'soul', icon: '/effect-icons/soul.webp' },
  { name: '门', value: 'salvage', icon: '/effect-icons/salvage.webp' },
  { name: '电', value: 'standby', icon: '/effect-icons/standby.webp' },
  { name: '书', value: 'draw', icon: '/effect-icons/draw.webp' },
  { name: '裤', value: 'gate', icon: '/effect-icons/gate.webp' },
  { name: '袋', value: 'stock', icon: '/effect-icons/stock.webp' },
  { name: '砖', value: 'treasure', icon: '/effect-icons/treasure.webp' },
  { name: '风', value: 'bounce', icon: '/effect-icons/bounce.webp' },
  { name: '火', value: 'shot', icon: '/effect-icons/shot.webp' },
  { name: 'Y', value: 'choice', icon: '/effect-icons/choice.webp' },
  { name: '镜', value: 'discovery', icon: '/effect-icons/discovery.webp' },
  { name: '灯', value: 'chance', icon: '/effect-icons/chance.webp' },
  { name: '橘', value: 'focus', icon: '/effect-icons/focus.webp' },
]

/**
 * Constants for listing tags
 */
const TAG_OPTIONS = [
  { label: '全平', value: 0 },
  { label: '有闪', value: 1 },
  { label: '有签', value: 2 },
  { label: '全闪', value: 3 },
  { label: '顶罕', value: 4 },
  { label: '大套', value: 5 },
]

const TAG_LABELS = TAG_OPTIONS.reduce((acc, t) => {
  acc[t.value] = t.label
  return acc
}, [])

export const useMarketStore = defineStore('market', () => {
  const authStore = useAuthStore()

  // --- State ---
  const listings = shallowRef([])
  const userListingCount = ref(0)
  const isLoading = ref(false)
  const pagination = reactive({
    cursor: null,
    hasMore: true,
    limit: 20,
    total: 0,
  })

  const rankingStats = shallowRef({
    updated_at: 0,
    top5: [],
  })
  const isRankingLoading = ref(false)

  // --- Filters ---
  const filters = reactive({
    gameType: 'ws',
    seriesId: null,
    climaxType: [],
    tag: [],
    source: 'all', // 'all' or 'mine'
    sort: 'newest', // 'newest' | 'price_asc' | 'price_desc'
  })

  // --- Computed ---
  const seriesOptions = computed(() => {
    return ALL_SERIES_OPTIONS.filter((opt) => opt.game === filters.gameType)
  })

  // --- Actions ---

  /**
   * Fetches market listings based on active filters and pagination
   * @param {boolean} isLoadMore - Whether to append results to existing list
   */
  const fetchListings = async (isLoadMore = false) => {
    if (!isLoadMore) {
      pagination.cursor = null
      listings.value = []
      pagination.hasMore = true
    }

    if (isLoading.value) return
    if (isLoadMore && !pagination.hasMore) return

    isLoading.value = true
    try {
      const queryParams = new URLSearchParams({
        limit: pagination.limit,
        sort: filters.sort,
        game_type: filters.gameType,
      })

      if (isLoadMore && pagination.cursor) {
        queryParams.append('cursor', pagination.cursor)
      }

      if (filters.seriesId) queryParams.append('series', filters.seriesId)
      if (filters.climaxType?.length > 0) {
        filters.climaxType.forEach((c) => queryParams.append('climax', c))
      }
      if (filters.tag?.length > 0) {
        filters.tag.forEach((t) => queryParams.append('tag', t))
      }

      const headers = {}
      if (authStore.isAuthenticated) {
        headers['Authorization'] = `Bearer ${authStore.token}`
      }

      const endpoint =
        filters.source === 'mine' ? '/api/market/my-listings' : '/api/market/listings'
      const response = await fetch(`${endpoint}?${queryParams.toString()}`, { headers })

      if (!response.ok) throw new Error('获取商品列表失败')

      const data = await response.json()

      if (filters.source === 'mine') {
        await fetchUserListingCount()
      }

      if (isLoadMore) {
        listings.value = [...listings.value, ...data.listings]
      } else {
        listings.value = data.listings
      }

      pagination.cursor = data.nextCursor
      pagination.hasMore = !!data.nextCursor

      if (data.total !== undefined) {
        pagination.total = data.total
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetches the total listing count for the current user
   */
  const fetchUserListingCount = async () => {
    if (!authStore.isAuthenticated) return

    try {
      const response = await fetch('/api/market/my-count', {
        headers: { Authorization: `Bearer ${authStore.token}` },
      })
      if (!response.ok) throw new Error('获取商品数量失败')
      const data = await response.json()
      userListingCount.value = data.count
    } catch (error) {
      console.error('Fetch user listing count error:', error)
    }
  }

  /**
   * Fetches market ranking statistics
   */
  const fetchRankingStats = async () => {
    if (isRankingLoading.value) return
    isRankingLoading.value = true
    try {
      const response = await fetch('/api/market/stats')
      if (!response.ok) throw new Error('获取排行榜统计失败')
      rankingStats.value = await response.json()
    } catch (error) {
      console.error('Failed to fetch ranking stats:', error)
    } finally {
      isRankingLoading.value = false
    }
  }

  /**
   * Creates a new market listing
   * @param {object} listingData
   */
  const createListing = async (listingData) => {
    if (!authStore.isAuthenticated) throw new Error('请先登录')

    isLoading.value = true
    try {
      const response = await fetch('/api/market/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
        },
        body: JSON.stringify(listingData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '发布商品失败')
      }

      await fetchUserListingCount()
      return await response.json()
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Updates an existing market listing
   * @param {string} listingId
   * @param {object} listingData
   */
  const updateListing = async (listingId, listingData) => {
    if (!authStore.isAuthenticated) throw new Error('请先登录')

    isLoading.value = true
    try {
      const response = await fetch(`/api/market/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
        },
        body: JSON.stringify(listingData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '更新商品失败')
      }

      return await response.json()
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Deletes a market listing by ID
   * @param {string} listingId
   */
  const deleteListing = async (listingId) => {
    if (!authStore.isAuthenticated) throw new Error('请先登录')

    try {
      const response = await fetch(`/api/market/listings/${listingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authStore.token}` },
      })

      if (!response.ok) throw new Error('删除商品失败')

      listings.value = listings.value.filter((l) => l.id !== listingId)
      await fetchUserListingCount()
    } catch (error) {
      console.error('Delete listing error:', error)
      throw error
    }
  }

  /**
   * Resets the store state to initial values
   */
  const reset = () => {
    listings.value = []
    userListingCount.value = 0
    isLoading.value = false
    Object.assign(pagination, {
      cursor: null,
      hasMore: true,
      limit: 20,
      total: 0,
    })
    Object.assign(filters, {
      gameType: 'ws',
      seriesId: null,
      climaxType: [],
      tag: [],
      source: 'all',
      sort: 'newest',
    })
  }

  return {
    listings,
    userListingCount,
    isLoading,
    pagination,
    filters,
    seriesOptions,
    allSeriesOptions: ALL_SERIES_OPTIONS,
    rankingStats,
    isRankingLoading,
    fetchListings,
    fetchUserListingCount,
    fetchRankingStats,
    createListing,
    updateListing,
    deleteListing,
    reset,
    // Constants
    climaxTypeOptions: CLIMAX_TYPE_OPTIONS,
    tagOptions: TAG_OPTIONS,
    tagLabels: TAG_LABELS,
  }
})
