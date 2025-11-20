import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckStore } from './deck'
import { jwtDecode } from 'jwt-decode'

export const useAuthStore = defineStore('auth', () => {
  const codeVersion = 1
  const deckStore = useDeckStore()
  const router = useRouter()

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
          return { token: parsed.token, rememberMe: parsed.rememberMe ?? true }
        }
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // Corrupted data, treat as invalid
        localStorage.removeItem('auth')
        sessionStorage.removeItem('auth')
      }
    }
    // If no stored value or version mismatch, return default
    return { token: null, rememberMe: true }
  }

  const { token: initToken, rememberMe: initRemember } = initState()
  const token = ref(initToken)
  const rememberMe = ref(initRemember)
  const userRole = ref(0)
  const userStatus = ref(null)
  const isAuthenticated = computed(() => !!token.value)

  // 儲存到 storage
  const saveToStorage = () => {
    localStorage.removeItem('auth')
    sessionStorage.removeItem('auth')
    if (token.value) {
      const storage = rememberMe.value ? localStorage : sessionStorage
      storage.setItem(
        'auth',
        JSON.stringify({ token: token.value, rememberMe: rememberMe.value, version: codeVersion })
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

    deckStore.reset()
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
        await fetchUserStatus()
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
        window.location.href = data.url
      } else {
        throw new Error('無法獲取支付 URL。')
      }
    } catch (error) {
      console.error('Payment initiation error:', error)
      throw error // 讓 UI 層可以捕獲並顯示
    }
  }

  //  刷新 Token 的 Action 🔽
  const refreshUserToken = async () => {
    if (!token.value) {
      //
      throw new Error('No token to refresh.')
    }
    try {
      const response = await fetch('/api/refresh-token', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })
      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }
      const data = await response.json()
      if (data.success && data.token) {
        token.value = data.token
        saveToStorage()
        await fetchUserStatus()
        console.log('Token refreshed.')
      } else {
        throw new Error('Invalid data from refresh token endpoint')
      }
    } catch (error) {
      console.error('refreshUserToken failed:', error)
      logout() // 如果刷新失敗 (例如 401)，強制登出
      throw error // 重新拋出錯誤
    }
  }

  const fetchUserStatus = async () => {
    // 獲取用戶狀態
    const getUserStatus = async () => {
      if (!token.value) {
        return null // 未登入
      }

      // 定義 Token 必須包含的鍵，用於結構驗證
      const REQUIRED_TOKEN_KEYS = ['sub', 'exp', 'role', 'p_exp']
      const hasAllKeys = (decoded) => REQUIRED_TOKEN_KEYS.every((key) => key in decoded)

      let decodedToken
      try {
        decodedToken = jwtDecode(token.value)
      } catch (error) {
        console.error('Invalid token, logging out.', error)
        logout()
        return null
      }

      const now = Math.floor(Date.now() / 1000)

      // 立即過期檢查
      if (decodedToken.exp < now) {
        console.log('Token is expired. Logging out.')
        logout()
        return null
      }

      // 檢查資料是否過時 (結構不符或 Premium 過期)
      const isTokenStale = (token) => {
        return !hasAllKeys(token) || (token.role === 1 && token.p_exp && token.p_exp < now)
      }

      if (isTokenStale(decodedToken)) {
        console.log(
          'Token is stale (outdated structure or expired premium). Refreshing from server...'
        )
        try {
          await refreshUserToken()
          decodedToken = jwtDecode(token.value) // 刷新後重新解碼

          // 再次檢查，如果資料仍然過時，避免無限刷新循環強制登出
          if (isTokenStale(decodedToken)) {
            console.error('Refreshed token is already expired. Logging out.')
            logout()
            return null
          }
          console.log('Token refreshed and data is now valid.')
        } catch (e) {
          // 刷新失敗（例如401），已在 refreshUserToken 中處理登出
          console.error('Token refresh failed while updating data:', e)
          return null
        }
      } else {
        // 如果資料沒問題，再檢查是否需要主動延長 Session
        const oneDayInSeconds = 24 * 60 * 60
        if (decodedToken.exp < now + oneDayInSeconds) {
          console.log('Token is nearing expiration. Refreshing session...')
          try {
            await refreshSession()
            decodedToken = jwtDecode(token.value) // 刷新後重新解碼
          } catch (e) {
            // refreshSession 內部已處理登出
            console.error('Proactive session refresh failed:', e)
            return null
          }
        }
      }

      let effectiveRole = decodedToken.role
      let effectivePremiumTime = decodedToken.p_exp

      // 如果 p_exp 存在但已過期，將其視為 null
      if (effectivePremiumTime && effectivePremiumTime < now) {
        effectivePremiumTime = null
      }

      return {
        id: decodedToken.sub,
        role: effectiveRole,
        premium_expire_time: effectivePremiumTime,
      }
    }

    try {
      const status = await getUserStatus()
      userStatus.value = status
      userRole.value = status ? status.role : 0
    } catch (error) {
      console.error('Failed to fetch user status:', error)
      userStatus.value = null
      userRole.value = 0
    }
  }

  return {
    token,
    isAuthenticated,
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
    refreshUserToken,
    fetchUserStatus,
  }
})
