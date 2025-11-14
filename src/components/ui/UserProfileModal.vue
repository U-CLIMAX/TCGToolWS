<template>
  <v-dialog v-model="isDialogOpen" max-width="400">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon>mdi-account</v-icon>
        账号资料
        <v-spacer></v-spacer>
        <v-btn
          text="刷新"
          @click="handleRefreshToken"
          :loading="isRefreshing"
          color="primary"
          variant="text"
        ></v-btn>
      </v-card-title>
      <v-card-text>
        <div v-if="!userData" class="text-center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-2">讀取中...</p>
        </div>
        <v-list v-else lines="two">
          <v-list-item title="账号 ID">
            <template #subtitle>
              <div class="d-flex align-center">
                <span>{{ userData.id }}</span>
                <v-tooltip text="复制 ID" location="bottom">
                  <template v-slot:activator="{ props: tooltipProps }">
                    <v-btn
                      v-bind="tooltipProps"
                      icon="mdi-content-copy"
                      variant="text"
                      size="x-small"
                      class="ml-2"
                      @click.stop="copyUserId(userData.id)"
                    ></v-btn>
                  </template>
                </v-tooltip>
              </div>
            </template>
          </v-list-item>
          <v-list-item title="帐号身份">
            <template #subtitle>
              <div class="d-flex align-center" style="min-height: 32px">
                <span>{{ userRoleText }}</span>
              </div>
            </template>
          </v-list-item>
          <v-list-item
            v-if="userData.role === 1 && userData.premium_expire_time"
            title="Premium 到期日"
          >
            <template #subtitle>
              <div class="d-flex align-center" style="min-height: 32px">
                <span>{{ formattedExpireTime }}</span>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-btn text="关闭" @click="isDialogOpen = false"></v-btn>
        <v-btn text="登出" @click="handleLogout" color="red-lighten-1"></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/composables/useSnackbar'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue', 'logout'])

const handleLogout = () => {
  emit('update:modelValue', false) // Close the modal
  emit('logout')
}

const authStore = useAuthStore()
const { triggerSnackbar } = useSnackbar()
const userData = ref(null)
const isRefreshing = ref(false)

const isDialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const roleMap = {
  0: '一般用戶',
  1: 'Premium',
  2: '開發者',
}

const userRoleText = computed(() => {
  if (!userData.value) return ''
  return roleMap[userData.value.role] || '未知角色'
})

const formattedExpireTime = computed(() => {
  if (!userData.value || !userData.value.premium_expire_time) return ''
  const date = new Date(userData.value.premium_expire_time * 1000)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const handleRefreshToken = async () => {
  isRefreshing.value = true
  try {
    await authStore.refreshUserToken()
    userData.value = await authStore.getUserStatus()
    triggerSnackbar('已成功刷新！')
  } catch (error) {
    console.error('刷新失敗:', error)
    triggerSnackbar('刷新失败，请稍后再试。', 'error')
  } finally {
    isRefreshing.value = false
  }
}

const copyUserId = async (id) => {
  try {
    await navigator.clipboard.writeText(id)
    triggerSnackbar('使用者 ID 已复制！')
  } catch (err) {
    console.error('无法复制 ID:', err)
    triggerSnackbar('复制失败，请手动复制。', 'error')
  }
}

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      userData.value = null // Reset on open for loading indicator
      userData.value = await authStore.getUserStatus()
    }
  },
  { immediate: true }
)
</script>
