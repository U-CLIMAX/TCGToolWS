<template>
  <div
    class="gallery-item-card rounded-xl"
    :class="{
      'glass-card': hasBackgroundImage,
      'bg-surface': !hasBackgroundImage,
      'is-top-tier': isTopTier,
    }"
    role="button"
    tabindex="0"
    @click="navigateToDeckDetail"
    @keydown.enter="navigateToDeckDetail"
    @keydown.space.prevent="navigateToDeckDetail"
  >
    <div class="d-flex flex-column h-100">
      <div class="d-flex flex-row flex-grow-1 pt-4">
        <div class="cover-section px-3">
          <CardImage
            :card="deck?.cover_cards_id"
            class="h-100 preload-img"
            :aspect-ratio="400 / 559"
          />
        </div>

        <div class="content-section d-flex flex-column pr-3">
          <div class="d-flex justify-space-between align-start mb-1">
            <h3
              class="text-h6 font-weight-bold text-truncate text-high-emphasis mr-2"
              style="line-height: 1.2"
            >
              {{ deck.deck_name || '未命名卡组' }}
            </h3>

            <div v-if="isMine" class="d-flex align-center flex-shrink-0 ga-1">
              <button
                type="button"
                class="action-btn text-primary"
                aria-label="编辑卡组"
                @click.stop="$emit('edit', deck)"
              >
                <i class="i-mdi:pencil-outline text-body-1" />
              </button>
              <button
                type="button"
                class="action-btn text-red-accent-2"
                aria-label="删除卡组"
                @click.stop="$emit('delete', deck.key)"
              >
                <i class="i-mdi:trash-can-outline text-body-1" />
              </button>
            </div>
            <div
              v-else
              class="d-flex align-center text-caption text-medium-emphasis flex-shrink-0 mt-auto"
            >
              <i class="i-mdi:clock-time-eight-outline text-caption mr-1" />
              {{ timeAgo }}
            </div>
          </div>

          <div class="d-flex align-center mb-2 mt-auto">
            <span class="text-body-2 text-medium-emphasis text-truncate">{{
              seriesName.replace('[cn]', '')
            }}</span>
          </div>

          <div class="card-list-container mt-auto">
            <div
              v-if="deck.climax_cards_id && deck.climax_cards_id.length > 0"
              class="card-scroll-wrapper"
            >
              <div v-for="cx in deck.climax_cards_id" :key="cx.id" class="mini-card-item">
                <CardImage
                  :card="cx"
                  :aspect-ratio="false"
                  contain
                  class="h-100 w-100 preload-img"
                />
              </div>
            </div>
            <div v-else class="text-caption text-disabled d-flex align-center justify-center h-100">
              无高潮卡
            </div>
          </div>
        </div>
      </div>

      <div class="d-flex align-center justify-space-between pt-1 pb-3 px-3 ga-2">
        <div v-if="deck.tournament_type" class="d-flex align-center ga-1 mt-auto overflow-hidden">
          <div class="info-pill">
            <span class="type-dot"></span>
            {{ tournamentText }}
          </div>
          <div v-if="deck.placement" class="info-pill">
            {{ placementText }}
          </div>
          <span v-if="deck.participant_count" class="participant-text ml-1">
            {{ participantText }}
          </span>
        </div>
        <div class="d-flex align-center ga-2 flex-shrink-0 ml-auto">
          <i
            v-if="deck.article_link"
            class="i-mdi:newspaper-variant-outline text-caption mt-1"
            style="color: rgba(var(--v-theme-on-surface), 0.5)"
          />
          <div
            class="rating-display d-flex align-center"
            :aria-label="`评分: ${deck.rating_avg || 0}`"
          >
            <i
              v-for="star in 5"
              :key="star"
              class="star-icon"
              :class="getStarIcon(deck.rating_avg, star)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { seriesMap } from '@/maps/series-map'

const props = defineProps({
  deck: {
    type: Object,
    required: true,
  },
  hasBackgroundImage: {
    type: Boolean,
    default: false,
  },
  isMine: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['delete', 'select', 'edit'])

const isTopTier = computed(() => !!props.deck.tournament_type)

const seriesInfo = computed(() => {
  if (!props.deck.series_id) return null
  const val = seriesMap[props.deck.series_id]
  return val ? { title: val.name, ...val } : null
})

const seriesName = computed(() => seriesInfo.value?.title || props.deck.series_id || '未知系列')

const tournamentText = computed(() => {
  const texts = {
    shop: '店赛',
    circuit: '巡回赛',
    wgp: 'WGP',
    bcf: 'BCF',
  }
  return texts[props.deck.tournament_type] || props.deck.tournament_type
})

const placementText = computed(() => {
  const texts = {
    champion: '冠军',
    runner_up: '亚军',
    top4: '四强',
    top8: '八强',
    top16: '十六强',
  }
  return texts[props.deck.placement] || props.deck.placement
})

const participantText = computed(() => {
  const texts = {
    'under10': '10人以下',
    '10to20': '10-20人',
    '20to30': '20-30人',
    'over30': '30人以上',
  }
  return texts[props.deck.participant_count] || ''
})

const timeAgo = computed(() => {
  if (!props.deck.updated_at) return ''
  const date = new Date(props.deck.updated_at * 1000)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return '刚刚'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分钟前`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小时前`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} 天前`
  return date.toLocaleDateString()
})

const getStarIcon = (rating, starIndex) => {
  const score = Number(rating) || 0
  if (score >= starIndex) return 'i-mdi:star'
  if (score >= starIndex - 0.5) return 'i-mdi:star-half-full'
  return 'i-mdi:star-outline'
}

const navigateToDeckDetail = () => {
  emit('select', props.deck.key)
}
</script>

<style scoped>
.gallery-item-card {
  contain: content;
  content-visibility: auto;
  contain-intrinsic-size: auto 160px;
  height: auto;
  min-height: 160px;
  transition:
    transform 0.2s ease-in-out,
    box-shadow 0.2s ease-in-out;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}

@media (hover: hover) and (pointer: fine) {
  .gallery-item-card:hover:not(.is-top-tier) {
    transform: translateY(-2px);
    box-shadow:
      0 3px 1px -2px rgba(0, 0, 0, 0.2),
      0 2px 2px 0 rgba(0, 0, 0, 0.14),
      0 1px 5px 0 rgba(0, 0, 0, 0.12);
  }

  .gallery-item-card.is-top-tier:hover {
    transform: translateY(-2px);
  }
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}

.action-btn:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}

.rating-display {
  color: rgb(255, 179, 0);
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.star-icon {
  width: 14px;
  height: 14px;
  font-size: 14px;
  display: inline-block;
  flex-shrink: 0;
}

/* 上位卡組特殊樣式：古典典雅金色質感 */

/* --- 頂部金屬光線（兩個主題共用 ::before）--- */
.gallery-item-card.is-top-tier::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  pointer-events: none;
}

/* --- 淺色主題：玫瑰金 --- */
.v-theme--light .gallery-item-card.is-top-tier {
  border: 1px solid rgba(180, 145, 55, 0.55) !important;
  box-shadow:
    0 0 0 1px rgba(200, 160, 55, 0.12),
    0 2px 8px rgba(140, 100, 20, 0.12),
    0 6px 20px rgba(160, 120, 30, 0.1),
    inset 0 1px 0 rgba(230, 190, 80, 0.4) !important;
}

.v-theme--light .gallery-item-card.is-top-tier:hover {
  border-color: rgba(180, 145, 55, 0.8) !important;
  box-shadow:
    0 0 0 1px rgba(200, 160, 55, 0.2),
    0 4px 12px rgba(140, 100, 20, 0.16),
    0 12px 28px rgba(160, 120, 30, 0.14),
    inset 0 1px 0 rgba(230, 190, 80, 0.55) !important;
}

.v-theme--light .gallery-item-card.is-top-tier::before {
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(200, 155, 40, 0.5) 15%,
    rgba(240, 195, 60, 1) 50%,
    rgba(200, 155, 40, 0.5) 85%,
    transparent
  );
}

/* --- 深色主題 --- */
.v-theme--dark .gallery-item-card.is-top-tier {
  border: 0.5px solid rgba(200, 160, 55, 0.3) !important;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.4),
    0 4px 16px rgba(180, 130, 30, 0.18),
    0 0 0 1px rgba(180, 140, 40, 0.08),
    inset 0 1px 0 rgba(220, 175, 60, 0.12) !important;
}

.v-theme--dark .gallery-item-card.is-top-tier:hover {
  border-color: rgba(200, 160, 55, 0.55) !important;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.5),
    0 12px 28px rgba(180, 130, 30, 0.28),
    0 0 0 1px rgba(180, 140, 40, 0.15),
    inset 0 1px 0 rgba(220, 175, 60, 0.2) !important;
}

.v-theme--dark .gallery-item-card.is-top-tier::before {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(180, 130, 30, 0.3) 15%,
    rgba(230, 185, 60, 0.85) 50%,
    rgba(180, 130, 30, 0.3) 85%,
    transparent,
    transparent 100%
  );
}

/* 左側封面區塊 */
.cover-section {
  flex: 0 0 30%;
  width: 30%;
  max-width: 120px;
  height: auto;
  max-height: 180px;
}

/* 右側內容區塊 */
.content-section {
  flex: 1 1 auto;
  width: 0;
  position: relative;
}

/* 下方卡片列表容器 */
.card-list-container {
  height: 56px;
  width: 100%;
  position: relative;
}

.card-scroll-wrapper {
  display: flex;
  gap: 6px;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
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

.info-pill {
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 12px;
  background-color: rgba(var(--v-theme-surface), 0.8);
  backdrop-filter: blur(4px) saturate(180%);
  -webkit-backdrop-filter: blur(4px) saturate(180%);
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  font-size: 0.65rem;
  font-weight: 700;
  height: 18px;
  white-space: nowrap;
  color: var(--info-pill-color);
}

.type-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 5px;
  flex-shrink: 0;
  background-color: var(--info-pill-color);
}

.participant-text {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.65rem;
  font-weight: 500;
}

:deep(.mini-card-item img) {
  object-fit: contain !important;
  transform: rotate(-90deg) scale(1.3975);
}
</style>
