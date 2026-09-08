import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckStore } from './deck'
import { usePriceStore } from './price'
import { useDecksGalleryStore } from './decksGallery'
import { jwtDecode } from 'jwt-decode'
import { apiFetch } from '@/utils/api.js'

export const useAuthStore = defineStore('auth', () => {
  const codeVersion = ref(1)
  const router = useRouter()

  /**
   * Initialize state from storage
   */
  const initState = () => {
    const local = localStorage.getItem('auth')
    const session = sessionStorage.getItem('auth')
    const stored = local || session
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.version === codeVersion.value) {
          return { token: parsed.token, rememberMe: parsed.rememberMe ?? true }
        }
      } catch {
        localStorage.removeItem('auth')
        sessionStorage.removeItem('auth')
      }
    }
    return { token: null, rememberMe: true }
  }

  const parseToken = (tokenString) => {
    if (!tokenString) return null
    try {
      const decoded = jwtDecode(tokenString)
      const now = Math.floor(Date.now() / 1000)
      if (decoded.exp && decoded.exp < now) {
        return null
      }
      let effectiveRole = decoded.role ?? 0
      let effectivePremiumTime = decoded.p_exp ?? null
      if (effectiveRole === 1 && effectivePremiumTime && effectivePremiumTime < now) {
        effectiveRole = 0
        effectivePremiumTime = null
      }
      return {
        id: decoded.sub,
        role: effectiveRole,
        premium_expire_time: effectivePremiumTime,
        exp: decoded.exp,
      }
    } catch {
      return null
    }
  }

  const { token: initToken, rememberMe: initRemember } = initState()
  const token = ref(initToken)
  const rememberMe = ref(initRemember)
  const initialParsed = parseToken(initToken)
  const userRole = ref(initialParsed ? initialParsed.role : 0)
  const userStatus = shallowRef(
    initialParsed
      ? {
          id: initialParsed.id,
          role: initialParsed.role,
          premium_expire_time: initialParsed.premium_expire_time,
        }
      : null
  )

  const checkInitialOnline = () => {
    if (typeof window !== 'undefined' && window.__AndroidNativeBridge__?.isNetworkAvailable) {
      try {
        return window.__AndroidNativeBridge__.isNetworkAvailable()
      } catch {
        // fallback
      }
    }
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  const isAuthReady = ref(false)
  const isOnline = ref(checkInitialOnline())
  const isAuthenticated = computed(() => !!token.value)

  const handleOnline = () => {
    isOnline.value = true
    fetchUserStatus()
  }

  const handleOffline = () => {
    isOnline.value = false
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }

  /**
   * Save auth state to persistent or session storage
   */
  const saveToStorage = () => {
    localStorage.removeItem('auth')
    sessionStorage.removeItem('auth')
    if (token.value) {
      const storage = rememberMe.value ? localStorage : sessionStorage
      storage.setItem(
        'auth',
        JSON.stringify({
          token: token.value,
          rememberMe: rememberMe.value,
          version: codeVersion.value,
        })
      )
    }
  }

  const updateUserFromToken = (tokenString) => {
    const parsed = parseToken(tokenString)
    if (!parsed) {
      if (tokenString) logout()
      else {
        userStatus.value = null
        userRole.value = 0
      }
      return
    }
    userStatus.value = {
      id: parsed.id,
      role: parsed.role,
      premium_expire_time: parsed.premium_expire_time,
    }
    userRole.value = parsed.role
  }

  const sendVerificationCode = async (email, password) => {
    if (!isOnline.value) throw new Error('网络连接已断开，请检查网络')
    const response = await apiFetch('/api/register/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '发送验证码失败')
    return data
  }

  const verifyAndRegister = async (email, code) => {
    if (!isOnline.value) throw new Error('网络连接已断开，请检查网络')
    const response = await apiFetch('/api/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '验证失败')
    return data
  }

  const login = async (email, password) => {
    if (!isOnline.value) throw new Error('网络连接已断开，请检查网络')
    const response = await apiFetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '登录失败')
    token.value = data.token
    saveToStorage()
    updateUserFromToken(data.token)

    const priceStore = usePriceStore()
    priceStore.reset()

    await fetchUserStatus()

    if (router.currentRoute.value.name !== 'Home') {
      window.location.reload()
    }

    return data
  }

  const logout = () => {
    token.value = null
    userRole.value = 0
    userStatus.value = null
    localStorage.removeItem('auth')
    sessionStorage.removeItem('auth')

    const deckStore = useDeckStore()
    const priceStore = usePriceStore()
    const decksGalleryStore = useDecksGalleryStore()

    deckStore.reset()
    priceStore.reset()
    decksGalleryStore.reset()
    router.push({ name: 'Home' })
  }

  const refreshSession = async () => {
    if (!token.value) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    try {
      const response = await apiFetch('/api/session/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data.token) {
        token.value = data.token
        saveToStorage()
        updateUserFromToken(data.token)
        console.log('Session refreshed successfully.')
      } else if (response.status === 401 || response.status === 403) {
        logout()
      }
    } catch (error) {
      console.warn('Failed to refresh session due to network error:', error)
    }
  }

  const forgotPassword = async (email) => {
    if (!isOnline.value) throw new Error('网络连接已断开，请检查网络')
    const response = await apiFetch('/api/password/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await response.json()
    if (!response.ok && data.error) {
      throw new Error(data.error || '请求失败，请稍后重试')
    }
    return data
  }

  const resetPassword = async (token, password) => {
    if (!isOnline.value) throw new Error('网络连接已断开，请检查网络')
    const response = await apiFetch('/api/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || '密码重置失败')
    }
    return data
  }

  const initiatePayment = async () => {
    if (!token.value) throw new Error('请先登录')
    if (!isOnline.value) throw new Error('网络连接已断开，请检查网络')

    try {
      const response = await apiFetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`,
        },
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '创建订单失败')

      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        throw new Error('无法获取支付 URL')
      }
    } catch (error) {
      console.error('Payment initiation error:', error)
      throw error
    }
  }

  const fetchUserStatus = async () => {
    if (!token.value) {
      userStatus.value = null
      userRole.value = 0
      isAuthReady.value = true
      return
    }

    const parsed = parseToken(token.value)
    if (!parsed) {
      logout()
      isAuthReady.value = true
      return
    }

    userStatus.value = {
      id: parsed.id,
      role: parsed.role,
      premium_expire_time: parsed.premium_expire_time,
    }
    userRole.value = parsed.role

    if (!isOnline.value) {
      isAuthReady.value = true
      return
    }

    const now = Math.floor(Date.now() / 1000)
    const oneDay = 24 * 60 * 60
    if (parsed.exp && parsed.exp < now + oneDay) {
      try {
        await refreshSession()
      } catch (e) {
        console.warn('Network issue during fetchUserStatus session refresh:', e)
      }
    }
    isAuthReady.value = true
  }

  return {
    version: codeVersion,
    token,
    isAuthenticated,
    isAuthReady,
    isOnline,
    rememberMe,
    userRole,
    userStatus,
    initiatePayment,
    sendVerificationCode,
    verifyAndRegister,
    login,
    logout,
    refreshSession,
    forgotPassword,
    resetPassword,
    fetchUserStatus,
  }
})
