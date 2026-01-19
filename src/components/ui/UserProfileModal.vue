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
        <div v-if="!userStatus" class="text-center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-2">讀取中...</p>
        </div>
        <v-list v-else lines="two">
          <v-list-item title="账号 ID">
            <template #subtitle>
              <div class="d-flex align-center">
                <span>{{ userStatus.id }}</span>
                <v-btn
                  icon="mdi-content-copy"
                  variant="text"
                  size="x-small"
                  class="ml-2"
                  @click.stop="copyUserId(userStatus.id)"
                  v-tooltip:bottom="'复制 ID'"
                ></v-btn>
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
            v-if="userStatus.role === 1 && userStatus.premium_expire_time"
            title="Premium 到期日"
          >
            <template #subtitle>
              <div class="d-flex align-center" style="min-height: 32px">
                <span>{{ formattedExpireTime }}</span>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <v-divider v-if="userStatus.role === 0" class="my-2"></v-divider>

        <div v-if="userStatus.role === 0" ref="supportSection" class="text-center pa-2">
          <p class="text-body-2">
            您的支持是本站持续营运的关键！<br />
            升级 Premium 可解锁更多强大功能。
          </p>
          <v-btn
            @click="handleUpgradeClick"
            variant="outlined"
            :color="theme === 'dark' ? 'yellow-accent-4' : 'amber-accent-4'"
            class="ma-3"
            rounded
          >
            升级 Premium
            <v-icon end icon="mdi-arrow-up-bold-circle-outline"></v-icon>
          </v-btn>
        </div>

        <v-divider v-if="userStatus.role === 0" class="my-2"></v-divider>

        <div class="pa-2">
          <v-btn
            variant="tonal"
            color="primary"
            prepend-icon="mdi-cog"
            @click="handleSettingsClick"
          >
            网站设置
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn text="关闭" @click="isDialogOpen = false"></v-btn>
        <v-btn text="登出" variant="tonal" @click="handleLogout" color="red-lighten-1"></v-btn>
      </v-card-actions>
    </v-card>
    <SponsorNoticeDialog v-model="isSponsorNoticeOpen" @confirm="proceedToPayment" />
    <SettingsModal v-model="isSettingsModalOpen" />
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'
import SponsorNoticeDialog from '@/components/ui/SponsorNoticeDialog.vue'
import SettingsModal from '@/components/ui/SettingsModal.vue'
import * as clipboard from 'clipboard-polyfill'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue', 'logout'])
const uiStore = useUIStore()
const { theme } = storeToRefs(uiStore)

const isSponsorNoticeOpen = ref(false)
const isSettingsModalOpen = ref(false)

const handleLogout = () => {
  emit('update:modelValue', false) // Close the modal
  emit('logout')
}

const authStore = useAuthStore()
const { userStatus } = storeToRefs(authStore)
const { triggerSnackbar } = useSnackbar()
const isRefreshing = ref(false)

const handleUpgradeClick = () => {
  isSponsorNoticeOpen.value = true
}

const handleSettingsClick = () => {
  isSettingsModalOpen.value = true
}

const proceedToPayment = async () => {
  isDialogOpen.value = false // Close the profile modal
  uiStore.setLoading(true)
  try {
    await authStore.initiatePayment()
  } catch (err) {
    console.error(err)
  } finally {
    uiStore.setLoading(false)
  }
}

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
  if (!userStatus.value) return ''
  return roleMap[userStatus.value.role] || '未知角色'
})

const formattedExpireTime = computed(() => {
  if (!userStatus.value || !userStatus.value.premium_expire_time) return ''
  const date = new Date(userStatus.value.premium_expire_time * 1000)
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
    await clipboard.writeText(id)
    triggerSnackbar('使用者 ID 已复制！')
  } catch (err) {
    console.error('无法复制 ID:', err)
    triggerSnackbar('复制失败，请手动复制。', 'error')
  }
}
</script>
