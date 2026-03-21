<template>
  <v-menu
    v-model="menuOpen"
    :close-on-content-click="false"
    location="bottom end"
    width="380"
    :offset="offset"
    transition="slide-y-transition"
  >
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" icon @click="handleOpen" style="min-width: 0" :ripple="false">
        <v-badge :model-value="noticeStore.hasNew" color="error" dot offset-x="2" offset-y="2">
          <v-icon :color="isHomeRoute ? 'white' : undefined">mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-card
      class="notice-card overflow-hidden"
      :class="{ 'glass-menu': hasBackgroundImage }"
      rounded="3md"
      elevation="12"
    >
      <div class="d-flex align-center px-5 py-4">
        <span class="text-h6 font-weight-bold">最近公告</span>
        <v-spacer></v-spacer>
        <div class="d-flex ga-1">
          <v-btn
            icon="mdi-refresh"
            variant="tonal"
            size="32"
            color="primary"
            class="rounded-lg"
            :loading="isRefreshing"
            @click="handleRefresh"
          ></v-btn>
          <v-btn
            v-if="isAdmin"
            icon="mdi-plus"
            variant="flat"
            size="32"
            color="primary"
            class="rounded-lg"
            @click="showCreateDialog = true"
          ></v-btn>
        </div>
      </div>

      <v-divider class="opacity-10"></v-divider>

      <v-list class="notice-list py-2 themed-scrollbar" max-height="480">
        <template v-if="noticeStore.notices.length > 0">
          <v-list-item
            v-for="notice in noticeStore.notices"
            :key="notice.id"
            class="px-5 py-3 notice-item"
            @click="viewDetail(notice)"
          >
            <template v-slot:prepend>
              <div class="notice-indicator-wrapper mr-4">
                <div :class="['notice-indicator', { 'is-important': notice.is_important }]"></div>
                <v-icon
                  :color="notice.is_important ? 'warning' : 'medium-emphasis'"
                  :icon="
                    notice.is_important ? 'mdi-alert-circle-outline' : 'mdi-information-outline'
                  "
                  size="20"
                ></v-icon>
              </div>
            </template>

            <div class="d-flex align-center mb-1 ga-2">
              <span class="text-subtitle-2 font-weight-bold text-high-emphasis text-truncate">{{
                notice.title
              }}</span>
              <v-chip
                v-if="notice.is_important"
                size="x-small"
                color="warning"
                variant="tonal"
                class="font-weight-bold px-2"
                style="height: 18px"
              >
                重要
              </v-chip>
            </div>

            <div class="text-caption text-medium-emphasis text-truncate-2 line-height-1-4">
              {{ notice.content }}
            </div>

            <template v-slot:append>
              <div class="d-flex flex-column align-end ga-2">
                <span class="text-caption text-disabled whitespace-nowrap">{{
                  formatDate(notice.updated_at)
                }}</span>
                <v-btn
                  v-if="isAdmin"
                  icon="mdi-trash-can-outline"
                  variant="text"
                  size="30"
                  color="error"
                  class="rounded-lg delete-btn"
                  @click.stop="handleDelete(notice.id)"
                ></v-btn>
              </div>
            </template>
          </v-list-item>
        </template>
        <div v-else class="d-flex flex-column align-center justify-center py-12 px-6 text-center">
          <v-icon
            icon="mdi-bell-off-outline"
            size="48"
            color="disabled"
            class="mb-3 opacity-20"
          ></v-icon>
          <div class="text-body-2 text-disabled">目前暂无公告</div>
        </div>
      </v-list>
    </v-card>
  </v-menu>

  <!-- 公告詳情 Dialog -->
  <v-dialog v-model="showDetailDialog" max-width="500" transition="dialog-bottom-transition">
    <v-card v-if="selectedNotice" class="rounded-2lg overflow-hidden">
      <v-card-title class="d-flex align-center pt-6 px-6">
        <v-avatar
          :color="selectedNotice.is_important ? 'warning' : 'primary'"
          variant="tonal"
          size="32"
          class="mr-3"
        >
          <v-icon
            :icon="selectedNotice.is_important ? 'mdi-alert-circle' : 'mdi-information'"
            size="18"
          ></v-icon>
        </v-avatar>
        <span class="text-h6 font-weight-bold">{{ selectedNotice.title }}</span>
      </v-card-title>
      <v-card-subtitle class="px-6 pb-4 d-flex align-center">
        <v-icon icon="mdi-clock-outline" size="14" class="mr-1"></v-icon>
        {{ formatDateFull(selectedNotice.updated_at) }}
      </v-card-subtitle>

      <v-divider class="mx-6 opacity-10"></v-divider>

      <v-card-text class="pa-8 text-body-1 whitespace-pre-wrap line-height-1-6 text-high-emphasis">
        {{ selectedNotice.content }}
      </v-card-text>

      <v-card-actions class="pa-6">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="flat"
          rounded="pill"
          class="px-6"
          @click="showDetailDialog = false"
        >
          我知道了
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 發布公告 Dialog -->
  <v-dialog v-model="showCreateDialog" max-width="500" persistent>
    <v-card class="rounded-2lg">
      <v-card-title class="pt-6 px-6 font-weight-bold">发布新公告</v-card-title>
      <v-card-text class="px-6 pt-2">
        <v-text-field
          v-model="newNotice.title"
          label="公告标题"
          placeholder="输入简洁明了的标题"
          variant="outlined"
          rounded="lg"
          class="mb-4"
          hide-details
        ></v-text-field>
        <v-textarea
          v-model="newNotice.content"
          label="公告內容"
          variant="outlined"
          rounded="lg"
          rows="5"
          class="mb-4"
          hide-details
        ></v-textarea>
        <v-switch
          v-model="newNotice.is_important"
          label="标记为重要公告"
          color="warning"
          density="compact"
          inset
          hide-details
        ></v-switch>
      </v-card-text>
      <v-card-actions class="pa-6">
        <v-spacer></v-spacer>
        <v-btn variant="text" rounded="pill" class="px-4" @click="showCreateDialog = false">
          取消
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          rounded="pill"
          class="px-6"
          :loading="loading"
          :disabled="!newNotice.title || !newNotice.content"
          @click="handleCreate"
        >
          立即发布
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useNoticeStore } from '@/stores/notice'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

defineProps({
  offset: {
    type: Number,
    required: true,
  },
})

const uiStore = useUIStore()
const noticeStore = useNoticeStore()
const authStore = useAuthStore()
const route = useRoute()

const menuOpen = ref(false)
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const selectedNotice = ref(null)
const loading = ref(false)
const isRefreshing = ref(false)

const isAdmin = computed(() => authStore.userRole === 2)
const isHomeRoute = computed(() => route.name === 'Home')
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const newNotice = ref({
  title: '',
  content: '',
  is_important: false,
})

const handleOpen = () => {
  noticeStore.markAsRead()
}

const handleRefresh = async () => {
  isRefreshing.value = true
  await noticeStore.fetchNotices()
  setTimeout(() => {
    isRefreshing.value = false
  }, 500)
}

const viewDetail = (notice) => {
  selectedNotice.value = notice
  showDetailDialog.value = true
}

const handleCreate = async () => {
  loading.value = true
  const success = await noticeStore.createNotice({
    ...newNotice.value,
    id: Math.random().toString(36).substring(2, 11),
    updated_at: Date.now(),
    is_important: newNotice.value.is_important ? 1 : 0,
  })

  if (success) {
    showCreateDialog.value = false
    newNotice.value = { title: '', content: '', is_important: false }
  }
  loading.value = false
}

const handleDelete = async (id) => {
  if (confirm('确定要删除这条公告吗？')) {
    await noticeStore.deleteNotice(id)
    if (selectedNotice.value?.id === id) {
      showDetailDialog.value = false
    }
  }
}

const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

const formatDateFull = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  noticeStore.fetchNotices()
})
</script>

<style scoped>
.notice-card {
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.notice-list {
  overflow-y: auto;
}

.notice-item {
  transition: background-color 0.2s ease;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.05);
}

.notice-item:last-child {
  border-bottom: none;
}

.notice-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.notice-indicator-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notice-indicator {
  position: absolute;
  left: -12px;
  width: 4px;
  height: 0;
  background-color: rgb(var(--v-theme-primary));
  border-radius: 0 4px 4px 0;
  transition: height 0.3s ease;
}

.notice-item:hover .notice-indicator {
  height: 24px;
}

.notice-indicator.is-important {
  background-color: rgb(var(--v-theme-warning));
}

.text-truncate-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-height-1-4 {
  line-height: 1.4;
}

.line-height-1-6 {
  line-height: 1.6;
}

.whitespace-nowrap {
  white-space: nowrap;
}

.whitespace-pre-wrap {
  white-space: pre-wrap;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.notice-item:hover .delete-btn {
  opacity: 1;
}
</style>
