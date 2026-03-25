import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

export const useNoticeStore = defineStore('notice', () => {
  const authStore = useAuthStore()

  // --- State ---
  const notices = ref([])
  const lastViewedTime = ref(Number(localStorage.getItem('notice_last_viewed')) || 0)

  // --- Computed ---

  /**
   * Checks if there are any unread notices based on the last viewed timestamp
   */
  const hasNew = computed(() => {
    if (notices.value.length === 0) return false
    const latestNotice = notices.value[0]
    return latestNotice.updated_at > lastViewedTime.value
  })

  // --- Actions ---

  /**
   * Fetches all notices from the backend
   */
  const fetchNotices = async () => {
    try {
      const response = await fetch('/api/notices')
      if (response.ok) {
        notices.value = await response.json()
      }
    } catch (error) {
      console.error('Failed to fetch notices:', error)
    }
  }

  /**
   * Marks all notices as read by updating the last viewed timestamp
   */
  const markAsRead = () => {
    const now = Date.now()
    lastViewedTime.value = now
    localStorage.setItem('notice_last_viewed', now.toString())
  }

  /**
   * Creates a new notice (Admin only)
   * @param {object} notice
   */
  const createNotice = async (notice) => {
    if (!authStore.isAuthenticated) throw new Error('请先登录')

    try {
      const response = await fetch('/api/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
        },
        body: JSON.stringify(notice),
      })
      if (response.ok) {
        await fetchNotices()
        return true
      }
    } catch (error) {
      console.error('Failed to create notice:', error)
    }
    return false
  }

  /**
   * Deletes a notice by ID (Admin only)
   * @param {string|number} id
   */
  const deleteNotice = async (id) => {
    if (!authStore.isAuthenticated) throw new Error('请先登录')

    try {
      const response = await fetch(`/api/notices/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.token}`,
        },
      })
      if (response.ok) {
        await fetchNotices()
        return true
      }
    } catch (error) {
      console.error('Failed to delete notice:', error)
    }
    return false
  }

  return {
    notices,
    hasNew,
    fetchNotices,
    markAsRead,
    createNotice,
    deleteNotice,
  }
})
