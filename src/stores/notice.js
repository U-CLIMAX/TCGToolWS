import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth';

export const useNoticeStore = defineStore('notice', () => {
  const notices = ref([]);
  const authStore = useAuthStore();
  const lastViewedTime = ref(localStorage.getItem('notice_last_viewed') || 0);

  // 計算是否有新公告（最新公告的更新時間晚於用戶上次查看的時間）
  const hasNew = computed(() => {
    if (notices.value.length === 0) return false;
    const latestNotice = notices.value[0];
    return latestNotice.updated_at > lastViewedTime.value;
  });

  const fetchNotices = async () => {
    try {
      // 假設 API endpoint 為 /api/notices
      const response = await fetch('/api/notices');
      if (response.ok) {
        notices.value = await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch notices:', error);
    }
  };

  const markAsRead = () => {
    const now = Date.now();
    lastViewedTime.value = now;
    localStorage.setItem('notice_last_viewed', now);
  };

  const createNotice = async (notice) => {
    try {
      const response = await fetch('/api/notices', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify(notice),
      });
      if (response.ok) {
        await fetchNotices();
        return true;
      }
    } catch (error) {
      console.error('Failed to create notice:', error);
    }
    return false;
  };

  const deleteNotice = async (id) => {
    try {
      const response = await fetch(`/api/notices/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      });
      if (response.ok) {
        await fetchNotices();
        return true;
      }
    } catch (error) {
      console.error('Failed to delete notice:', error);
    }
    return false;
  };

  return {
    notices,
    hasNew,
    fetchNotices,
    markAsRead,
    createNotice,
    deleteNotice,
  };
});
