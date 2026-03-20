<template>
  <v-menu
    v-model="menuOpen"
    :close-on-content-click="false"
    location="bottom end"
    width="400"
    :offset="offset"
  >
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" icon @click="handleOpen" style="min-width: 0" :ripple="false">
        <v-badge :model-value="noticeStore.hasNew" color="error" dot offset-x="2" offset-y="2">
          <v-icon :color="isHomeRoute ? 'white' : undefined">mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-card class="notice-card" :class="{ 'glass-menu': hasBackgroundImage }" rounded="3md">
      <v-card-title class="d-flex align-center py-3 text-subtitle-1 font-weight-bold">
        <span>最新公告</span>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-refresh"
          variant="text"
          size="small"
          class="mr-1"
          :loading="isRefreshing"
          @click="handleRefresh"
        ></v-btn>
        <v-btn
          v-if="isAdmin"
          icon="mdi-plus"
          variant="text"
          size="small"
          color="primary"
          @click="showCreateDialog = true"
        ></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-list class="notice-list py-0 themed-scrollbar" max-height="500">
        <template v-if="noticeStore.notices.length > 0">
          <template v-for="(notice, index) in noticeStore.notices" :key="notice.id">
            <v-list-item class="py-3" @click="viewDetail(notice)">
              <template v-slot:prepend>
                <v-icon
                  :color="notice.is_important ? 'warning' : 'blue-grey-lighten-2'"
                  :icon="notice.is_important ? 'mdi-alert-circle' : 'mdi-bell-outline'"
                  size="small"
                ></v-icon>
              </template>

              <v-list-item-title class="font-weight-bold text-truncate">
                {{ notice.title }}
              </v-list-item-title>

              <v-list-item-subtitle class="mt-1 text-truncate text-body-2">
                {{ notice.content }}
              </v-list-item-subtitle>

              <div class="mt-2 d-flex align-center text-caption text-medium-emphasis">
                <span>{{ formatDate(notice.updated_at) }}</span>
                <v-spacer></v-spacer>
                <v-btn
                  v-if="isAdmin"
                  icon="mdi-delete-outline"
                  variant="text"
                  size="x-small"
                  color="error"
                  @click.stop="handleDelete(notice.id)"
                ></v-btn>
              </div>
            </v-list-item>
            <v-divider v-if="index < noticeStore.notices.length - 1"></v-divider>
          </template>
        </template>
        <v-list-item v-else class="text-center py-8">
          <v-list-item-title class="text-medium-emphasis">目前暂无公告</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>

  <!-- 公告詳情 Dialog -->
  <v-dialog v-model="showDetailDialog" max-width="500">
    <v-card v-if="selectedNotice" class="rounded-2lg">
      <v-card-title class="d-flex align-center pt-4 px-6">
        <v-icon v-if="selectedNotice.is_important" color="warning" class="mr-2"
          >mdi-alert-circle</v-icon
        >
        <span class="text-h6 font-weight-bold">{{ selectedNotice.title }}</span>
      </v-card-title>
      <v-card-subtitle class="px-6 pb-2">
        {{ formatDate(selectedNotice.updated_at) }}
      </v-card-subtitle>
      <v-divider class="mx-6"></v-divider>
      <v-card-text class="pa-6 text-body-1 whitespace-pre-wrap">
        {{ selectedNotice.content }}
      </v-card-text>
      <v-card-actions class="pa-4 justify-end">
        <v-btn color="primary" variant="tonal" @click="showDetailDialog = false">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 發布公告 Dialog -->
  <v-dialog v-model="showCreateDialog" max-width="500">
    <v-card title="发布新公告" class="rounded-2lg">
      <v-card-text>
        <v-text-field
          v-model="newNotice.title"
          label="标题"
          variant="outlined"
          density="comfortable"
        ></v-text-field>
        <v-textarea
          v-model="newNotice.content"
          label="内容"
          variant="outlined"
          rows="4"
          hide-details
        ></v-textarea>
        <v-checkbox
          v-model="newNotice.is_important"
          label="标记为重要公告"
          density="compact"
          hide-details
        ></v-checkbox>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="showCreateDialog = false">取消</v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          :loading="loading"
          :disabled="!newNotice.title || !newNotice.content"
          @click="handleCreate"
        >
          发布
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
  if (confirm('確定要刪除這條公告嗎？')) {
    await noticeStore.deleteNotice(id)
    if (selectedNotice.value?.id === id) {
      showDetailDialog.value = false
    }
  }
}

const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
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
.whitespace-pre-wrap {
  white-space: pre-wrap;
}
</style>
