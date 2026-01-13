import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { seriesMap } from '@/maps/series-map'

export const useMarketStore = defineStore(
  'market',
  () => {
    const listings = ref([])
    const userListingCount = ref(0)
    const isLoading = ref(false)
    const pagination = ref({
      page: 1,
      limit: 20,
      total: 0,
      hasMore: true,
      nextCursor: null,
    })

    const rankingStats = ref({
      updated_at: 0,
      top5: [],
    })
    const isRankingLoading = ref(false)

    // 篩選條件
    const filters = ref({
      seriesId: null,
      climaxType: [],
      tag: [],
      source: 'all', // 'all' or 'mine'
      sort: 'newest', // 'newest'/ 'price_asc'/ 'price_desc'
    })

    const authStore = useAuthStore()

    const seriesOptions = computed(() => {
      return Object.keys(seriesMap)
        .filter((key) => !['ws', 'wsr'].includes(seriesMap[key].id))
        .map((key) => ({
          title: key,
          value: seriesMap[key].id,
        }))
        .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
    })

    const climaxTypeOptions = [
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
    ]
    const tagOptions = [
      { label: '全平', value: 0 },
      { label: '有闪', value: 1 },
      { label: '有签', value: 2 },
      { label: '全闪', value: 3 },
      { label: '顶罕', value: 4 },
      { label: '大套', value: 5 },
    ]

    const tagLabels = tagOptions.reduce((acc, t) => {
      acc[t.value] = t.label
      return acc
    }, [])

    // Actions
    const fetchListings = async (isLoadMore = false) => {
      // 如果不是加載更多，立即清空列表，防止切換時顯示舊資料
      if (!isLoadMore) {
        pagination.value.page = 1
        pagination.value.nextCursor = null
        listings.value = []
        pagination.value.hasMore = true
      }

      if (isLoading.value) return

      // 如果沒有更多數據，直接返回
      if (isLoadMore && !pagination.value.hasMore) return

      isLoading.value = true
      try {
        const queryParams = new URLSearchParams({
          limit: pagination.value.limit,
          sort: filters.value.sort,
        })

        if (isLoadMore && pagination.value.nextCursor) {
          queryParams.append('cursor', pagination.value.nextCursor)
        }

        if (filters.value.seriesId) queryParams.append('series', filters.value.seriesId)
        if (filters.value.climaxType && filters.value.climaxType.length > 0) {
          filters.value.climaxType.forEach((c) => queryParams.append('climax', c))
        }
        if (filters.value.tag && filters.value.tag.length > 0) {
          filters.value.tag.forEach((t) => queryParams.append('tag', t))
        }

        const headers = {}
        if (authStore.isAuthenticated) {
          headers['Authorization'] = `Bearer ${authStore.token}`
        }

        const endpoint =
          filters.value.source === 'mine' ? '/api/market/my-listings' : '/api/market/listings'

        const response = await fetch(`${endpoint}?${queryParams.toString()}`, {
          headers,
        })

        if (!response.ok) {
          throw new Error('获取商品列表失败')
        }

        const data = await response.json()

        if (filters.value.source === 'mine') {
          await fetchUserListingCount()
        }

        if (isLoadMore) {
          listings.value = [...listings.value, ...data.listings]
          pagination.value.page += 1
        } else {
          listings.value = data.listings
          pagination.value.page = 1
        }

        // Update cursor and hasMore status
        pagination.value.nextCursor = data.nextCursor
        pagination.value.hasMore = !!data.nextCursor

        // Update total only if returned (backend might skip it for optimization)
        if (data.total !== undefined) {
          pagination.value.total = data.total
        }
      } catch (error) {
        console.error('Failed to fetch listings:', error)
        throw error
      } finally {
        isLoading.value = false
      }
    }

    const fetchUserListingCount = async () => {
      if (!authStore.isAuthenticated) return

      try {
        const response = await fetch('/api/market/my-count', {
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })
        if (!response.ok) throw new Error('获取商品数量失败')
        const data = await response.json()
        userListingCount.value = data.count
      } catch (error) {
        console.error(error)
      }
    }

    const fetchRankingStats = async () => {
      if (isRankingLoading.value) return
      isRankingLoading.value = true
      try {
        const response = await fetch('/api/market/stats')
        if (!response.ok) throw new Error('获取排行榜统计失败')
        const data = await response.json()
        rankingStats.value = data
      } catch (error) {
        console.error('Failed to fetch ranking stats:', error)
      } finally {
        isRankingLoading.value = false
      }
    }

    const createListing = async (listingData) => {
      if (!authStore.isAuthenticated) throw new Error('请先登入')

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

        // Refresh count after creation
        fetchUserListingCount()
        return await response.json()
      } finally {
        isLoading.value = false
      }
    }

    const updateListing = async (listingId, listingData) => {
      if (!authStore.isAuthenticated) throw new Error('请先登入')

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

    const deleteListing = async (listingId) => {
      if (!authStore.isAuthenticated) throw new Error('请先登入')

      try {
        const response = await fetch(`/api/market/listings/${listingId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        if (!response.ok) throw new Error('删除商品失败')

        listings.value = listings.value.filter((l) => l.id !== listingId)
        // Refresh count after deletion
        fetchUserListingCount()
      } catch (error) {
        console.error(error)
        throw error
      }
    }

    const reset = () => {
      listings.value = []
      userListingCount.value = 0
      isLoading.value = false
      pagination.value = {
        page: 1,
        limit: 20,
        total: 0,
        hasMore: true,
        nextCursor: null,
      }
      filters.value = {
        seriesId: null,
        climaxType: [],
        tag: [],
        source: 'all',
        sort: 'newest',
      }
    }

    return {
      listings,
      userListingCount,
      isLoading,
      pagination,
      filters,
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
      seriesOptions,
      climaxTypeOptions,
      tagOptions,
      tagLabels,
    }
  },
  {
    persist: {
      storage: sessionStorage,
    },
  }
)
