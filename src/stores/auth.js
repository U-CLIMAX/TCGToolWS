import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckStore } from './deck'
import { useMarketStore } from './market'
import { jwtDecode } from 'jwt-decode'

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
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        localStorage.removeItem('auth')
        sessionStorage.removeItem('auth')
      }
    }
    return { token: null, rememberMe: true }
  }

  const { token: initToken, rememberMe: initRemember } = initState()
  const token = ref(initToken)
  const rememberMe = ref(initRemember)
  const userRole = ref(0)
  const userStatus = ref(null)
  const isAuthReady = ref(false)
  const isAuthenticated = computed(() => !!token.value)

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

  const sendVerificationCode = async (email, password) => {
    const response = await fetch('/api/register/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '发送验证码失败')
    return data
  }

  const verifyAndRegister = async (email, code) => {
    const response = await fetch('/api/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '验证失败')
    return data
  }

  const login = async (email, password) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || '登录失败')
    token.value = data.token
    saveToStorage()
    await fetchUserStatus()
    return data
  }

  const logout = () => {
    token.value = null
    userRole.value = 0
    userStatus.value = null
    localStorage.removeItem('auth')
    sessionStorage.removeItem('auth')

    const deckStore = useDeckStore()
    const marketStore = useMarketStore()

    deckStore.reset()
    marketStore.reset()
    router.push({ name: 'Home' })
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
        updateUserFromToken(data.token)
        console.log('Session refreshed successfully.')
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
      throw new Error(data.error || '请求失败，请稍后重试')
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
      throw new Error(data.error || '密码重置失败')
    }
    return data
  }

  const initiatePayment = async () => {
    if (!token.value) throw new Error('请先登录')

    try {
      const response = await fetch('/api/payments/initiate', {
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

  const updateUserFromToken = (tokenString) => {
    if (!tokenString) {
      userStatus.value = null
      userRole.value = 0
      return
    }

    try {
      const decodedToken = jwtDecode(tokenString)
      const now = Math.floor(Date.now() / 1000)

      let effectiveRole = decodedToken.role
      let effectivePremiumTime = decodedToken.p_exp
      if (effectivePremiumTime && effectivePremiumTime < now) {
        effectivePremiumTime = null
      }

      const status = {
        id: decodedToken.sub,
        role: effectiveRole,
        premium_expire_time: effectivePremiumTime,
      }

      userStatus.value = status
      userRole.value = status.role
    } catch (e) {
      console.error('Failed to decode token:', e)
      logout()
    }
  }

  const fetchUserStatus = async () => {
    if (!token.value) {
      userStatus.value = null
      userRole.value = 0
      isAuthReady.value = true
      return
    }

    try {
      let decodedToken
      try {
        decodedToken = jwtDecode(token.value)
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        logout()
        return
      }

      const now = Math.floor(Date.now() / 1000)
      if (decodedToken.exp < now) {
        logout()
        return
      }

      // Proactive session refresh (if expiring within 24 hours)
      const oneDay = 24 * 60 * 60
      if (decodedToken.exp < now + oneDay) {
        await refreshSession()
      } else {
        updateUserFromToken(token.value)
      }
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      userStatus.value = null
      userRole.value = 0
    } finally {
      isAuthReady.value = true
    }
  }

  return {
    version: codeVersion,
    token,
    isAuthenticated,
    isAuthReady,
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
