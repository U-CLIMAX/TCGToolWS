<template>
  <v-dialog v-model="dialog" max-width="400" persistent>
    <v-card :loading="loading || resending">
      <!-- ============================================= -->
      <!-- View 1: Credentials Input (登录/注册信息输入) -->
      <!-- ============================================= -->
      <template v-if="step === 'credentials'">
        <v-card :title="isLoginMode ? '登录' : '注册'">
          <template #append>
            <v-btn
              v-if="isLoginMode"
              icon="mdi-cog"
              variant="text"
              @click="handleSettingsClick"
              :disabled="loading"
            ></v-btn>
            <v-btn
              icon="mdi-close"
              variant="text"
              @click="dialog = false"
              :disabled="loading"
            ></v-btn>
          </template>

          <v-card-text>
            <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>
            <v-form
              ref="credentialsForm"
              v-model="isFormValid"
              @submit.prevent="handleCredentialSubmit"
            >
              <v-text-field
                v-model="email"
                label="邮箱"
                type="email"
                variant="outlined"
                :readonly="loading"
                :rules="emailRules"
                class="mb-2"
              ></v-text-field>

              <v-text-field
                :append-inner-icon="password_visible ? 'mdi-eye-off' : 'mdi-eye'"
                :type="password_visible ? 'text' : 'password'"
                v-model="password"
                label="密码"
                variant="outlined"
                :readonly="loading"
                :autocomplete="isLoginMode ? 'on' : 'off'"
                :rules="isLoginMode ? [] : passwordRules"
                class="mb-2"
                @click:append-inner="password_visible = !password_visible"
              ></v-text-field>

              <div v-if="isLoginMode" class="d-flex justify-space-between align-center mb-4">
                <v-checkbox
                  v-model="authStore.rememberMe"
                  label="保持登录"
                  hide-details
                ></v-checkbox>
                <v-btn
                  variant="text"
                  size="small"
                  :to="{ name: 'ForgotPassword' }"
                  @click="dialog = false"
                >
                  忘记密码?
                </v-btn>
              </div>

              <v-text-field
                v-if="!isLoginMode"
                v-model="passwordConfirm"
                label="确定密码"
                type="password"
                variant="outlined"
                :readonly="loading"
                autocomplete="off"
                :rules="passwordConfirmRules"
                class="mb-2"
              ></v-text-field>

              <v-btn
                v-if="!isLoginMode"
                type="submit"
                block
                color="primary"
                size="large"
                :loading="loading"
                :disabled="!isFormValid || isRegisterCoolingDown"
              >
                {{ `发送验证码 ${registerCooldownText}` }}
              </v-btn>
              <v-btn
                v-else
                type="submit"
                block
                color="primary"
                size="large"
                :loading="loading"
                :disabled="email.trim() && password.length >= 8 ? false : true"
              >
                登录
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions class="justify-center">
            <v-btn variant="text" @click="toggleMode" :disabled="loading">
              {{ isLoginMode ? '还没有帐号？点此注册' : '已有帐号？点此登入' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </template>

      <!-- ======================================== -->
      <!-- View 2: Verification Code Input (验证码输入) -->
      <!-- ======================================== -->
      <template v-if="step === 'verification'">
        <v-card title="输入验证码">
          <template #append>
            <v-btn
              icon="mdi-close"
              variant="text"
              @click="dialog = false"
              :disabled="loading"
            ></v-btn>
          </template>

          <v-card-text>
            <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>
            <v-alert v-if="successMessage" type="success" density="compact" class="mb-4">{{
              successMessage
            }}</v-alert>
            <p class="text-body-2 mb-4">
              我们已将 6 位数验证码发送到 <strong>{{ email }}</strong>
            </p>

            <v-form @submit.prevent="handleVerificationSubmit">
              <v-otp-input v-model="verificationCode" :length="6" class="mb-4"></v-otp-input>
              <v-btn
                type="submit"
                block
                color="primary"
                size="large"
                :loading="loading"
                :disabled="!isVerificationCodeReady"
              >
                验证并注册
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions class="justify-space-between px-4">
            <v-btn variant="text" @click="step = 'credentials'" :disabled="loading">返回</v-btn>
            <v-btn
              variant="text"
              @click="handleResendCode"
              :loading="resending"
              :disabled="isResendCoolingDown"
            >
              {{ resendButtonText }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </template>
    </v-card>
    <SettingsModal v-model="isSettingsModalOpen" />
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/composables/useSnackbar'
import { useCooldown } from '@/composables/useCooldown'
import SettingsModal from '@/components/ui/SettingsModal.vue'

const authStore = useAuthStore()
const { triggerSnackbar } = useSnackbar()

// 为不同按钮的冷却逻辑创建独立的实例
const {
  isCoolingDown: isRegisterCoolingDown,
  cooldownText: registerCooldownText,
  startCooldown: startRegisterCooldown,
} = useCooldown(60)

const {
  isCoolingDown: isResendCoolingDown,
  cooldownText: resendCooldownText,
  startCooldown: startResendCooldown,
} = useCooldown(60)

// --- Component State ---
const dialog = ref(false)
const isSettingsModalOpen = ref(false)
const step = ref('credentials') // 'credentials' or 'verification'
const mode = ref('login') // 'login' or 'register'

// --- Form Data ---
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const verificationCode = ref('')
const credentialsForm = ref(null)
const isFormValid = ref(false)
const password_visible = ref(false)

// Validation Rules
const emailRules = [
  (v) => !!v || '请输入邮箱',
  (v) => {
    const pattern =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return pattern.test(v) || '无效的邮箱格式'
  },
]
const passwordRules = [
  (v) => !!v || '请输入密码',
  (v) => (v && v.length >= 8) || '密码长度至少为 8 个字符',
]
const passwordConfirmRules = [
  (v) => !!v || '请再次输入密码',
  (v) => v === password.value || '两次输入的密码不一致',
]

// --- UI Feedback State ---
const loading = ref(false) // 主要提交按钮的 loading
const resending = ref(false) // “重新发送”按钮的 loading
const error = ref(null)
const successMessage = ref(null)

// --- Computed Properties ---
const isLoginMode = computed(() => mode.value === 'login')

const isVerificationCodeReady = computed(() => {
  return verificationCode.value?.length === 6
})

const resendButtonText = computed(() => {
  return isResendCoolingDown.value ? `重新发送 ${resendCooldownText.value}` : '重新发送'
})

// --- Core Logic Handlers ---
const handleCredentialSubmit = async () => {
  error.value = null

  if (!isLoginMode.value) {
    const { valid } = await credentialsForm.value.validate()
    if (!valid) return
  }

  loading.value = true
  try {
    if (isLoginMode.value) {
      await authStore.login(email.value, password.value)
      dialog.value = false
      triggerSnackbar('登录成功！')
    } else {
      const result = await authStore.sendVerificationCode(email.value, password.value)
      successMessage.value = result.message
      step.value = 'verification'
      startRegisterCooldown()
      startResendCooldown()
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const handleVerificationSubmit = async () => {
  error.value = null
  loading.value = true
  try {
    const result = await authStore.verifyAndRegister(email.value, verificationCode.value)
    successMessage.value = null
    mode.value = 'login'
    step.value = 'credentials'
    triggerSnackbar(`${result.message} 请使用新帐号登录`)
    verificationCode.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const handleResendCode = async () => {
  resending.value = true
  error.value = null
  successMessage.value = null
  try {
    const result = await authStore.sendVerificationCode(email.value, password.value)
    triggerSnackbar(result.message, 'success')
    startResendCooldown()
  } catch (e) {
    error.value = e.message
  } finally {
    resending.value = false
  }
}

const handleSettingsClick = () => {
  isSettingsModalOpen.value = true
}

// --- Helper Functions ---
const resetState = () => {
  step.value = 'credentials'
  mode.value = 'login'
  email.value = ''
  password.value = ''
  passwordConfirm.value = ''
  verificationCode.value = ''
  error.value = null
  successMessage.value = null
  loading.value = false
  resending.value = false
}

const toggleMode = () => {
  mode.value = isLoginMode.value ? 'register' : 'login'
  password.value = ''
  passwordConfirm.value = ''
  error.value = null
  successMessage.value = null
}

const open = () => {
  resetState()
  dialog.value = true
}
defineExpose({ open })
</script>
