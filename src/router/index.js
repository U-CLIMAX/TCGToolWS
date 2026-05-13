import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false })

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to, from) => {
  NProgress.start()

  const authStore = useAuthStore()

  // 透過 fetchUserStatus 實現自動刷新
  // 1. Token 結構過期 -> 自動刷新
  // 2. Premium 過期 -> 自動刷新
  // 3. Token 無效或解碼失敗 -> 自動登出
  // 4. 更新 Store 中的 userRole 和 userStatus
  await authStore.fetchUserStatus()

  const isAuthenticated = authStore.isAuthenticated
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest)

  if (requiresAuth && !isAuthenticated) {
    return { name: 'Home' }
  } else if (requiresGuest && isAuthenticated) {
    return { name: 'Home' }
  } else {
    return true
  }
})

// eslint-disable-next-line no-unused-vars
router.afterEach((to, from) => {
  const uiStore = useUIStore()
  if (to.name == 'GlobalSearch') {
    uiStore.isFilterOpen = true
  }
  NProgress.done()
})

export default router
