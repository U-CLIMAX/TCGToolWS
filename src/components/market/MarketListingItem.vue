<template>
  <v-card class="h-100 d-flex flex-column pa-2" elevation="2" hover>
    <!-- Header: Series & Time -->
    <v-card-item class="pa-0">
      <template #prepend>
        <v-avatar size="24" :image="seriesIcon" rounded></v-avatar>
      </template>
      <template #append>
        <div class="text-caption text-grey">
          {{ timeAgo }}
        </div>
      </template>
    </v-card-item>

    <!-- Images Carousel -->
    <div class="position-relative mt-2 bg-grey-lighten-4 rounded-lg overflow-hidden">
      <v-carousel
        v-if="listing.cards_id && listing.cards_id.length > 0"
        hide-delimiters
        crossfade
        :show-arrows="listing.cards_id.length > 1 ? 'hover' : false"
        class="h-100"
      >
        <v-carousel-item v-for="card in listing.cards_id" :key="card.id">
          <v-img
            :src="getCardUrl(card).base"
            :lazy-src="getCardUrl(card).blur"
            cover
            class="preload-img"
            :aspect-ratio="400 / 559"
            style="transform: scale(1.05)"
          >
            <template #error>
              <v-img src="/placehold.webp" :aspect-ratio="400 / 559" cover />
            </template>
          </v-img>
        </v-carousel-item>
      </v-carousel>

      <!-- Tags Overlay -->
      <div
        v-if="listing.tags && listing.tags.length > 0"
        class="title-background d-flex align-end pb-2 px-2"
      >
        <div class="d-flex flex-wrap gap-1">
          <v-chip
            v-for="tagIndex in listing.tags"
            :key="tagIndex"
            size="x-small"
            variant="flat"
            color="rgba(0, 0, 0, 0.6)"
            class="text-white border-white border-opacity-25"
            style="border: 1px solid rgba(255, 255, 255, 0.3)"
          >
            {{ marketStore.tagLabels[tagIndex] || '未知标签' }}
          </v-chip>
        </div>
      </div>
    </div>

    <!-- Content -->
    <v-card-text class="pt-3">
      <!-- Price -->
      <div class="text-h6 font-weight-bold text-error mb-2">¥ {{ listing.price }}</div>

      <!-- Climax Icons -->
      <div
        v-if="listing.climax_types && listing.climax_types.length > 0"
        class="d-flex mt-1 align-center ga-1"
      >
        <v-avatar
          v-for="type in listing.climax_types.slice(0, 3)"
          :key="type"
          size="24"
          rounded="0"
        >
          <v-img :src="getClimaxIcon(type)" :alt="type" />
        </v-avatar>
        <span
          v-if="listing.climax_types.length > 3"
          class="text-caption text-grey font-weight-bold"
        >
          +{{ listing.climax_types.length - 3 }}
        </span>
      </div>
    </v-card-text>
    <!-- Actions -->
    <v-divider></v-divider>
    <v-card-actions class="pa-0">
      <v-btn
        v-if="marketStore.filters.source !== 'mine'"
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-content-copy"
        class="flex-grow-1"
        @click="copyLink(listing.shop_url)"
      >
        复制购买链接
      </v-btn>

      <v-btn
        v-else
        color="secondary"
        variant="outlined"
        size="small"
        prepend-icon="mdi-pencil"
        class="flex-grow-1"
        @click="emit('edit', listing)"
      >
        编辑
      </v-btn>

      <v-btn
        v-if="listing.deck_code"
        :icon="DeckIcon"
        variant="text"
        size="small"
        color="teal-lighten-1"
        v-tooltip:top="'  查看卡组'"
        density="compact"
        @click="navigateToDeckDetail"
      ></v-btn>

      <v-btn
        v-if="marketStore.filters.source === 'mine'"
        icon="mdi-delete"
        variant="text"
        size="small"
        color="error"
        v-tooltip:top="'删除商品'"
        density="compact"
        :loading="isDeleting"
        @click="confirmDelete"
      ></v-btn>
    </v-card-actions>

    <v-dialog v-model="showDeleteDialog" max-width="300">
      <v-card title="确认删除" text="确定要移除此商品吗？此操作无法撤销。">
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text="取消" @click="showDeleteDialog = false"></v-btn>
          <v-btn color="error" variant="flat" text="删除" @click="handleDelete"></v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { seriesMap } from '@/maps/series-map'
import { useCardImage } from '@/composables/useCardImage'
import { useMarketStore } from '@/stores/market'
import { useSnackbar } from '@/composables/useSnackbar'

import DeckIcon from '@/assets/ui/deck.svg'

const props = defineProps({
  listing: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['edit'])

const marketStore = useMarketStore()
const { triggerSnackbar } = useSnackbar()
const router = useRouter()

const showDeleteDialog = ref(false)
const isDeleting = ref(false)

const seriesInfo = computed(() => {
  const entry = Object.entries(seriesMap).find(([, val]) => val.id === props.listing.series_name)
  return entry ? { title: entry[0], ...entry[1] } : null
})

const seriesIcon = computed(() => {
  if (!seriesInfo.value) return ''
  return `/series-icons/${seriesInfo.value.icon}.webp`
})

const getCardUrl = (card) => {
  if (!card || !card.id || !card.cardIdPrefix) return { base: '', blur: '' }
  const { base, blur } = useCardImage(card.cardIdPrefix, card.id)
  return { base: base.value, blur: blur.value }
}

const getClimaxIcon = (value) => {
  const option = marketStore.climaxTypeOptions.find((opt) => opt.value === value)
  return option ? option.icon : ''
}

const timeAgo = computed(() => {
  const date = new Date(props.listing.updated_at)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return '刚刚'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分钟前`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小时前`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} 天前`
  return date.toLocaleDateString()
})

const navigateToDeckDetail = () => {
  router.push({ name: 'ShareDeckDetail', params: { key: props.listing.deck_code } })
}

const confirmDelete = () => {
  showDeleteDialog.value = true
}

const copyLink = async (url) => {
  try {
    await navigator.clipboard.writeText(url)
    triggerSnackbar('链接已复制', 'success')
  } catch (err) {
    console.error('Failed to copy: ', err)
    triggerSnackbar('复制失败', 'error')
  }
}

const handleDelete = async () => {
  isDeleting.value = true
  try {
    await marketStore.deleteListing(props.listing.id)
    triggerSnackbar('商品已删除', 'success')
    showDeleteDialog.value = false
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    triggerSnackbar('删除失败', 'error')
  } finally {
    isDeleting.value = false
  }
}
</script>

<style scoped>
.gap-1 {
  gap: 4px;
}

.title-background {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 20%, transparent 100%);
  pointer-events: none;
  z-index: 2;
}

/* 左右切換按鈕 */
:deep(.v-carousel .v-window__controls .v-btn) {
  width: 33px !important;
  height: 33px !important;
  background-color: rgba(0, 0, 0, 0.6) !important;
}

:deep(.v-carousel .v-window__controls .v-btn .v-icon) {
  color: #fff !important;
  font-size: 24px !important;
}
</style>
