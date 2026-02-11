<template>
  <v-hover v-slot="{ isHovering, props: hoverProps }">
    <v-card
      v-bind="hoverProps"
      class="gallery-item-card rounded-xl"
      :class="{ 'is-lifted': isHovering && !isTouch }"
      elevation="0"
      border
      @click="navigateToDeckDetail"
    >
      <div class="d-flex flex-row fill-height py-4">
        <div class="cover-section px-3">
          <v-img
            :src="getCardUrls(deck.cover_cards_id.cardIdPrefix, deck.cover_cards_id.id).base"
            :lazy-src="getCardUrls(deck.cover_cards_id.cardIdPrefix, deck.cover_cards_id.id).blur"
            class="h-100 preload-img"
            :aspect-ratio="400 / 559"
          >
            <template #error>
              <v-img src="/placehold.webp" cover class="fill-height" />
            </template>
          </v-img>
        </div>

        <div class="content-section d-flex flex-column pr-3 flex-grow-1">
          <div class="d-flex justify-space-between align-start mb-1">
            <h3
              class="text-h6 font-weight-bold text-truncate text-high-emphasis mr-2"
              style="line-height: 1.2"
            >
              {{ deck.deck_name || '未命名卡組' }}
            </h3>

            <div v-if="galleryStore.filters.source === 'mine'" class="flex-shrink-0">
              <v-btn
                color="red-accent-2"
                variant="text"
                icon="mdi-trash-can-outline"
                size="small"
                density="comfortable"
                @click.stop="confirmDelete"
              ></v-btn>
            </div>
            <div
              v-else
              class="d-flex align-center text-caption text-medium-emphasis flex-shrink-0 mt-auto"
            >
              <v-icon icon="mdi-clock-time-eight-outline" size="small" class="mr-1"></v-icon>
              {{ timeAgo }}
            </div>
          </div>

          <div class="d-flex align-center mb-3 mt-auto">
            <span class="text-body-2 text-medium-emphasis text-truncate">{{ seriesName }}</span>
          </div>

          <div class="card-list-container mt-auto">
            <div
              v-if="deck.climax_cards_id && deck.climax_cards_id.length > 0"
              class="card-scroll-wrapper"
            >
              <div v-for="cx in deck.climax_cards_id" :key="cx.id" class="mini-card-item">
                <v-img
                  :src="getCardUrls(cx.cardIdPrefix, cx.id).base"
                  :lazy-src="getCardUrls(cx.cardIdPrefix, cx.id).blur"
                  class="preload-img"
                />
              </div>
            </div>
            <div v-else class="text-caption text-disabled d-flex align-center justify-center h-100">
              无高潮卡
            </div>
          </div>
        </div>
      </div>

      <v-dialog v-model="showDeleteDialog" max-width="320">
        <v-card class="rounded-2lg pa-2">
          <v-card-title>确认删除</v-card-title>
          <v-card-text class="text-body-2 text-medium-emphasis">
            确定要从广场移除此卡组吗？此操作无法撤销。
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="showDeleteDialog = false">取消</v-btn>
            <v-btn color="error" variant="tonal" @click="handleDelete" class="px-4">删除</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-hover>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDecksGalleryStore } from '@/stores/decksGallery'
import { seriesMap } from '@/maps/series-map'
import { getCardUrls } from '@/utils/getCardImage'
import { useDevice } from '@/composables/useDevice'

const props = defineProps({
  deck: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['delete'])

const { isTouch } = useDevice()
const router = useRouter()
const galleryStore = useDecksGalleryStore()

const showDeleteDialog = ref(false)

const seriesInfo = computed(() => {
  // 安全檢查，防止 series_id 為空導致錯誤
  if (!props.deck.series_id) return null
  const entry = Object.entries(seriesMap).find(([, val]) => val.id === props.deck.series_id)
  return entry ? { title: entry[0], ...entry[1] } : null
})

const seriesName = computed(() => seriesInfo.value?.title || props.deck.series_id || '未知系列')

// 簡化並格式化時間顯示，更貼近圖片風格 (MM月DD日)
const timeAgo = computed(() => {
  if (!props.deck.updated_at) return ''
  const date = new Date(props.deck.updated_at * 1000)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  // 如果是 3 天內，顯示「天前」
  if (diffInSeconds < 259200) {
    if (diffInSeconds < 60) return '剛剛'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分前`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小時前`
    return `${Math.floor(diffInSeconds / 86400)} 天前`
  }

  // 超過 3 天顯示日期 (例如 2月1日)
  return `${date.getMonth() + 1}月${date.getDate()}日`
})

const navigateToDeckDetail = () => {
  try {
    const win = window.open()
    const route = router.resolve({
      name: 'ShareDeckDetail',
      params: { key: props.deck.key },
    })
    win.location.href = route.href
  } catch {
    router.push({ name: 'ShareDeckDetail', params: { key: props.deck.key } })
  }
}

const confirmDelete = () => {
  showDeleteDialog.value = true
}

const handleDelete = () => {
  emit('delete', props.deck.key)
  showDeleteDialog.value = false
}
</script>

<style scoped>
.gallery-item-card {
  height: 150px;
  transition: all 0.2s ease-in-out;
  background-color: rgb(var(--v-theme-surface));
  cursor: pointer;
  overflow: hidden;
}

.gallery-item-card.is-lifted {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08) !important;
}

/* 左側封面區塊 */
.cover-section {
  width: 30%; /* 佔寬度的 30% */
  height: 100%;
}

/* 右側內容區塊 */
.content-section {
  width: 70%; /* 剩餘空間 */
  position: relative;
  min-width: 0; /* Flexbox 文字截斷的關鍵 */
}

/* 下方卡片列表容器 */
.card-list-container {
  height: 56px; /* 固定高度給縮圖 */
  width: 100%;
  position: relative;
}

.card-scroll-wrapper {
  display: flex;
  gap: 6px;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  /* 隱藏滾動條樣式 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.card-scroll-wrapper::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.mini-card-item {
  height: 100%;
  aspect-ratio: 559 / 400;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
}

:deep(.mini-card-item .v-img__img.v-img__img--contain) {
  transform: rotate(-90deg) scale(1.3);
}
</style>
