<template>
  <v-dialog v-model="isDialogOpen" max-width="400">
    <v-card class="profile-modal-card">
      <!-- Header (shares background color with Body) -->
      <v-card-title class="d-flex align-center px-5 profile-modal-header">
        <v-icon icon="i-mdi:account" size="42" class="mr-3 text-high-emphasis" />
        <span class="text-h6 font-weight-bold text-high-emphasis">账号资料</span>
        <v-spacer></v-spacer>
        <v-btn
          icon
          size="40"
          variant="flat"
          color="surface"
          class="rounded-circle"
          :elevation="0"
          :loading="isRefreshing"
          @click="handleRefreshToken"
          title="刷新"
        >
          <v-icon icon="i-mdi:refresh" color="primary" size="24" />
        </v-btn>
      </v-card-title>

      <v-divider class="profile-divider" />

      <!-- Body -->
      <v-card-text class="profile-modal-body px-6 py-5 d-flex flex-column ga-4">
        <!-- 账号ID -->
        <div>
          <div class="text-subtitle-1 font-weight-bold text-high-emphasis">账号ID</div>
          <div v-if="!userStatus" class="py-1">
            <div class="skeleton-pill w-100 mb-2"></div>
            <div class="skeleton-pill w-50"></div>
          </div>
          <div
            v-else
            class="d-flex align-center text-body-2 font-weight-medium text-medium-emphasis"
            style="word-break: break-all"
          >
            <span>{{ userStatus.id }}</span>
            <v-btn
              icon="i-mdi:content-copy"
              variant="text"
              size="x-small"
              :elevation="0"
              class="ml-1 flex-shrink-0"
              @click.stop="copyUserId(userStatus.id)"
              title="复制 ID"
            />
          </div>
        </div>

        <!-- 账号身份 -->
        <div>
          <div class="text-subtitle-1 font-weight-bold text-high-emphasis">账号身份</div>
          <div v-if="!userStatus" class="py-1">
            <div class="skeleton-pill w-33"></div>
          </div>
          <div v-else class="text-body-2 font-weight-medium text-medium-emphasis">
            {{ userRoleText }}
          </div>
        </div>

        <!-- Premium 到期日 (如果适用) -->
        <div v-if="userStatus?.role === 1 && userStatus?.premium_expire_time">
          <div class="text-subtitle-1 font-weight-bold text-high-emphasis">Premium 到期日</div>
          <div class="text-body-2 font-weight-medium text-medium-emphasis">
            {{ formattedExpireTime }}
          </div>
        </div>

        <!-- 客户端版本 -->
        <div v-if="isTauri">
          <div class="text-subtitle-1 font-weight-bold text-high-emphasis">客户端版本</div>
          <div class="d-flex align-center text-body-2 font-weight-medium text-medium-emphasis">
            <span>{{ appVersionDisplay }}</span>
            <v-chip
              v-if="hasClientUpdate"
              color="warning"
              size="small"
              class="ml-2 font-weight-bold"
              variant="tonal"
              prepend-icon="i-mdi:arrow-up-bold-circle"
              @click.stop="handleClientUpdateClick"
            >
              新版本 v{{ clientUpdateVersion }}
            </v-chip>
          </div>
        </div>

        <!-- 赞助/升级提示 (一般用户) -->
        <div
          v-if="userStatus?.role === 0"
          ref="supportSection"
          class="text-center pa-3 rounded-lg bg-surface border"
        >
          <p class="text-body-2 text-medium-emphasis mb-2">
            您的支持是本站持续营运的关键！<br />
            升级 Premium 可解锁更多强大功能。
          </p>
          <v-btn
            @click="handleUpgradeClick"
            variant="tonal"
            :elevation="0"
            :color="theme === 'dark' ? 'yellow-accent-4' : 'amber-darken-2'"
            rounded="pill"
            size="small"
          >
            升级 Premium
            <v-icon end icon="i-mdi:arrow-up-bold-circle-outline" />
          </v-btn>
        </div>

        <!-- 功能按钮组 (统一使用 flat 与 elevation="0" 關閉陰影) -->
        <div class="d-flex flex-column align-start ga-2 mt-1">
          <v-btn
            variant="flat"
            color="surface"
            rounded="pill"
            :elevation="0"
            class="text-primary font-weight-bold text-body-2 px-5"
            prepend-icon="i-mdi:cog"
            @click="handleSettingsClick"
          >
            网站设置
          </v-btn>
          <v-btn
            v-if="userRole === 2"
            variant="flat"
            color="surface"
            rounded="pill"
            :elevation="0"
            class="text-primary font-weight-bold text-body-2 px-5"
            prepend-icon="i-mdi:chart-bar"
            :href="umami_share_url"
            target="_blank"
          >
            访问统计
          </v-btn>
          <v-btn
            variant="flat"
            color="surface"
            rounded="pill"
            :elevation="0"
            class="text-error font-weight-bold text-body-2 px-5"
            prepend-icon="i-mdi:arrow-top-right"
            @click="handleLogout"
          >
            退出登录
          </v-btn>
        </div>
      </v-card-text>

      <!-- Footer (white/surface container) -->
      <v-card-actions class="bg-surface px-5 py-4 d-flex justify-end">
        <v-btn
          color="primary"
          variant="flat"
          rounded="pill"
          :elevation="0"
          class="px-6 font-weight-bold text-body-2"
          @click="isDialogOpen = false"
        >
          关闭
        </v-btn>
      </v-card-actions>
    </v-card>
    <SponsorNoticeDialog v-model="isSponsorNoticeOpen" @confirm="proceedToPayment" />
  </v-dialog>
  <SettingsModal v-model="isSettingsModalOpen" />
</template>

<script setup>
import { ref, computed, onMounted, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { isTauri } from '@/utils/isTauri'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'
import { writeText } from '@/utils/clipboard'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue', 'logout'])
const router = useRouter()
const uiStore = useUIStore()
const { theme } = storeToRefs(uiStore)

const hasClientUpdate = ref(false)
const clientUpdateVersion = ref('')
const localAppVersion = ref('')

const isSponsorNoticeOpen = ref(false)
const isSettingsModalOpen = ref(false)
const appVersion = ref('')

onMounted(async () => {
  if (isTauri) {
    try {
      const { useClientUpdate } = await import('@/composables/useClientUpdate')
      const update = useClientUpdate()
      watchEffect(() => {
        hasClientUpdate.value = update.hasClientUpdate.value
        clientUpdateVersion.value = update.clientUpdateVersion.value
        localAppVersion.value = update.localAppVersion.value
        if (update.localAppVersion.value) {
          appVersion.value = update.localAppVersion.value
        }
      })
      if (!update.localAppVersion.value) {
        const { getVersion } = await import('@tauri-apps/api/app')
        const ver = await getVersion()
        appVersion.value = ver
        localAppVersion.value = ver
      }
    } catch (err) {
      console.warn('获取客户端版本或更新失败:', err)
    }
  }
})

const appVersionDisplay = computed(() => {
  if (appVersion.value || localAppVersion.value) {
    return `v${appVersion.value || localAppVersion.value}`
  }
  return 'v2.0.1'
})

const handleClientUpdateClick = () => {
  isDialogOpen.value = false
  router.push({ name: 'Download' })
}

const handleLogout = () => {
  emit('update:modelValue', false) // Close the modal
  emit('logout')
}

const authStore = useAuthStore()
const { userStatus, userRole } = storeToRefs(authStore)
const { triggerSnackbar } = useSnackbar()
const isRefreshing = ref(false)

const umami_share_url = import.meta.env.VITE_UMAMI_SHARE_URL

const handleUpgradeClick = () => {
  isSponsorNoticeOpen.value = true
}

const handleSettingsClick = () => {
  isDialogOpen.value = false
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
  return date.toLocaleString(undefined, {
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
    await authStore.refreshSession()
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
    await writeText(id)
    triggerSnackbar('使用者 ID 已复制！')
  } catch (err) {
    console.error('无法复制 ID:', err)
    triggerSnackbar('复制失败，请手动复制。', 'error')
  }
}
</script>

<style scoped>
.profile-modal-card {
  border-radius: 28px !important;
  overflow: hidden;
}

.profile-modal-header,
.profile-modal-body {
  background-color: #efefef;
}

:deep(.v-theme--dark) .profile-modal-header,
:deep(.v-theme--dark) .profile-modal-body,
.v-theme--dark .profile-modal-header,
.v-theme--dark .profile-modal-body {
  background-color: #1e1e22;
}

.profile-divider {
  border-color: #cccccc !important;
  opacity: 1 !important;
}

:deep(.v-theme--dark) .profile-divider,
.v-theme--dark .profile-divider {
  border-color: rgba(255, 255, 255, 0.15) !important;
  opacity: 1 !important;
}
.skeleton-pill {
  height: 14px;
  background-color: rgba(0, 0, 0, 0.12);
  border-radius: 9999px;
}

:deep(.v-theme--dark) .skeleton-pill,
.v-theme--dark .skeleton-pill {
  background-color: rgba(255, 255, 255, 0.15);
}
</style>
