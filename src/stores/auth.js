import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import router from '@/router'
import { useDeckStore } from './deck'

export const useAuthStore = defineStore('auth', () => {
  const codeVersion = 1
  const deckStore = useDeckStore()

  // 初始化:從 storage 讀取
  const initState = () => {
    const local = localStorage.getItem('auth')
    const session = sessionStorage.getItem('auth')
    const stored = local || session
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Version check
        if (parsed.version === codeVersion) {
          return {
            token: parsed.token,
            user: parsed.user || null,
            rememberMe: parsed.rememberMe ?? true,
          }
        }
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // Corrupted data, treat as invalid
        localStorage.removeItem('auth')
        sessionStorage.removeItem('auth')
      }
    }
    // If no stored value or version mismatch, return default
    return { token: null, user: null, rememberMe: true }
  }

  const { token: initToken, user: initUser, rememberMe: initRemember } = initState()
  const token = ref(initToken)
  const user = ref(initUser)
  const rememberMe = ref(initRemember)
  const isAuthenticated = computed(() => !!token.value)

  // 儲存到 storage
  const saveToStorage = () => {
    localStorage.removeItem('auth')
    sessionStorage.removeItem('auth')
    if (token.value) {
      const storage = rememberMe.value ? localStorage : sessionStorage
      storage.setItem(
        'auth',
        JSON.stringify({
          token: token.value,
          user: user.value,
          rememberMe: rememberMe.value,
          version: codeVersion,
        })
      )
    }
  }

  const sendVerificationCode = async (email, password) => {
    const response = await fetch('/api/register/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '發送驗證碼失敗。')
    return data
  }

  const verifyAndRegister = async (email, code) => {
    const response = await fetch('/api/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '驗證失敗。')
    return data
  }

  const login = async (email, password) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Login failed.')
    token.value = data.token
    user.value = data.user
    saveToStorage()
    return data
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('auth')
    sessionStorage.removeItem('auth')

    deckStore.reset()
  }

  const refreshSession = async () => {
    if (!token.value) return

    try {
      const response = await fetch('/api/session/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })
      const data = await response.json()
      if (response.ok && data.token) {
        token.value = data.token
        saveToStorage()
        console.log('Session refreshed successfully.')
      } else if (data.error) {
        console.error('Failed to refresh session:', data.error)
        logout()
      } else {
        logout()
      }
    } catch (error) {
      console.error('Failed to refresh session:', error)
      logout()
    }
  }

  const forgotPassword = async (email) => {
    const response = await fetch('/api/password/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await response.json()
    if (!response.ok && data.error) {
      throw new Error(data.error || '请求失败，请稍后重试。')
    }
    return data
  }

  const resetPassword = async (token, password) => {
    const response = await fetch('/api/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || '密码重置失败。')
    }
    return data
  }

  const initiatePayment = async () => {
    if (!token.value) {
      throw new Error('請先登入。')
    }

    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`,
        },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '創建訂單失敗。')
      }

      if (data.success && data.url) {
        // 成功，執行跳轉
        window.open(data.url, '_blank', 'noopener,noreferrer')
      } else {
        throw new Error('無法獲取支付 URL。')
      }
    } catch (error) {
      console.error('Payment initiation error:', error)
      throw error // 讓 UI 層可以捕獲並顯示
    }
  }

  watch(isAuthenticated, (isAuth, wasAuth) => {
    if (wasAuth && !isAuth) {
      const currentRoute = router.currentRoute.value
      if (currentRoute.meta.requiresAuth) {
        router.push({ name: 'Home' })
      }
    }
  })

  return {
    token,
    user,
    isAuthenticated,
    rememberMe,
    initiatePayment,
    sendVerificationCode,
    verifyAndRegister,
    login,
    logout,
    refreshSession,
    forgotPassword,
    resetPassword,
  }
})
