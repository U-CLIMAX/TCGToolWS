<!-- src/views/ResetPasswordView.vue -->
<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>重置密码</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-alert
              v-if="message"
              :type="error ? 'error' : 'success'"
              density="compact"
              class="mb-4"
              >{{ message }}</v-alert
            >
            <v-form ref="form" v-model="isFormValid" @submit.prevent="handleSubmit">
              <p v-if="!token || invalidToken" class="text-error">
                无效的重置链接，请返回首页重新申请。
              </p>
              <template v-else-if="!success">
                <v-text-field
                  :append-inner-icon="password_visible ? 'mdi-eye-off' : 'mdi-eye'"
                  :type="password_visible ? 'text' : 'password'"
                  v-model="password"
                  label="新密码"
                  variant="outlined"
                  :readonly="loading"
                  autocomplete="new-password"
                  :rules="passwordRules"
                  @click:append-inner="password_visible = !password_visible"
                  class="mb-2"
                ></v-text-field>
                <v-text-field
                  v-model="passwordConfirm"
                  label="确定新密码"
                  type="password"
                  variant="outlined"
                  :readonly="loading"
                  autocomplete="new-password"
                  :rules="passwordConfirmRules"
                  class="mb-2"
                ></v-text-field>
                <v-btn
                  type="submit"
                  block
                  color="primary"
                  size="large"
                  :loading="loading"
                  :disabled="!isFormValid"
                  >确定重置</v-btn
                >
              </template>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="goToHome" color="primary">返回首页</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useSnackbar } from '@/composables/useSnackbar'

const props = defineProps({
  token: {
    type: String,
    required: true,
  },
})

const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)
const message = ref('')
const error = ref(false)
const success = ref(false)
const invalidToken = ref(false)
const form = ref(null)
const isFormValid = ref(false)
const password_visible = ref(false)

const passwordRules = [
  (v) => !!v || '请输入密码',
  (v) => (v && v.length >= 8) || '密码长度至少为 8 个字符',
]
const passwordConfirmRules = [
  (v) => !!v || '请再次输入密码',
  (v) => v === password.value || '两次输入的密码不一致',
]

const authStore = useAuthStore()
const router = useRouter()
const { triggerSnackbar } = useSnackbar()

onMounted(() => {
  if (!props.token) {
    invalidToken.value = true
  }
})

const handleSubmit = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return

  loading.value = true
  message.value = ''
  error.value = false
  try {
    const response = await authStore.resetPassword(props.token, password.value)
    message.value = response.message
    success.value = true
    triggerSnackbar(response.message, 'success')
  } catch (e) {
    message.value = e.message
    error.value = true
  } finally {
    loading.value = false
  }
}

const goToHome = () => {
  router.push({ name: 'Home' })
}
</script>
