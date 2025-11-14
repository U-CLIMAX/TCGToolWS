import { useAuthStore } from '@/stores/auth'

/**
 * Asynchronously retrieves the user's role.
 * @returns {Promise<number>} A promise that resolves to the user's role number (e.g., 0 for regular, 1 for premium). Defaults to 0 if not authenticated or on error.
 */
export async function getUserRole() {
  const authStore = useAuthStore()
  try {
    const userStatus = await authStore.getUserStatus()
    return userStatus ? userStatus.role : 0
  } catch (error) {
    console.error('Failed to fetch user status:', error)
    return 0
  }
}
