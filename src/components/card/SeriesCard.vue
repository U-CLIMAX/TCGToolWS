<template>
  <RouterLink
    :to="{ name: 'SeriesDetail', params: { seriesId: seriesData.id } }"
    class="series-card d-flex flex-column flex-grow-1 overflow-visible"
    :class="[{ compact: isCompact }]"
  >
    <div
      class="image-wrapper position-relative"
      :class="isCompact ? 'mb-1 rounded-2lg' : 'mb-2 rounded-xl'"
    >
      <CardImage
        :src="`/series-icons/original/${encodeURIComponent(seriesData.id)}.webp`"
        :blur="`/series-icons/blur/${encodeURIComponent(seriesData.id)}.webp`"
        aspect-ratio="1"
        :rounded="isCompact ? '2lg' : 'xl'"
        class="series-image preload-img"
      />

      <!-- Compact 模式下 Hover 時顯示的資訊覆蓋層 -->
      <div v-if="isCompact" class="hover-overlay rounded-2lg d-flex align-end">
        <div class="pa-2 w-100">
          <div class="text-caption text-white text-truncate mb-1">
            <v-icon size="x-small" class="mr-1" icon="i-mdi:layers-outline" />
            {{ seriesData.prefixes.map((p) => p.replace('[cn]', '')).join(', ') }}
          </div>
          <div class="text-caption text-white">
            {{ seriesData.latestReleaseDate }}
          </div>
        </div>
      </div>
    </div>

    <!-- pill-content -->
    <div
      v-if="!isCompact"
      class="pill-content d-flex flex-column px-6 py-1 mt-auto rounded-pill border"
      :class="{ 'glass-card': hasBackgroundImage, 'bg-surface': !hasBackgroundImage }"
    >
      <div class="pill-sub-content d-flex align-center mb-1">
        <div
          class="d-flex align-center flex-grow-1 text-medium-emphasis overflow-hidden"
          style="min-width: 0"
        >
          <v-icon size="x-small" class="mr-1 flex-shrink-0" icon="i-mdi:layers-outline" />
          <div class="text-truncate pr-px font-DINCond font-weight-regular">
            {{ seriesData.prefixes.map((p) => p.replace('[cn]', '')).join(', ') }}
          </div>
        </div>
        <div class="text-medium-emphasis ml-2 flex-shrink-0 font-DINCond font-weight-regular">
          {{ seriesData.latestReleaseDate }}
        </div>
      </div>
      <div class="text-truncate font-weight-medium text-subtitle-2">
        {{ seriesName }}
      </div>
    </div>

    <!-- Compact 模式下的簡易名稱 -->
    <div v-else class="text-truncate font-weight-medium text-caption text-center px-0.5">
      {{ seriesName }}
    </div>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'

defineProps({
  seriesName: {
    type: String,
    required: true,
  },
  seriesData: {
    type: Object,
    required: true,
  },
  isCompact: {
    type: Boolean,
    default: false,
  },
})

const uiStore = useUIStore()
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)
</script>

<style scoped>
.series-card {
  width: 100%;
  min-width: 0;
  text-decoration: none;
  color: inherit;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-rendering: geometricPrecision;
  backface-visibility: hidden;
  box-shadow: none !important;
}

.series-card:not(.compact) {
  content-visibility: auto;
  contain-intrinsic-size: auto 240px;
}

.image-wrapper {
  flex: 0 0 auto;
  aspect-ratio: 1;
  overflow: hidden;
  will-change: transform;
  box-shadow: none !important;
}

.pill-content {
  will-change: transform;
  box-shadow: none !important;
}

.series-image {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* === Standard Mode Hover === */
@media (hover: hover) {
  .series-card:not(.compact):hover {
    transform: translateY(-4px);
  }

  /* === Compact Mode Hover === */
  .series-card.compact:hover {
    transform: translateY(-4px);
  }

  .series-card.compact:hover .series-image {
    transform: scale(1.06);
  }

  .series-card.compact:hover .hover-overlay {
    opacity: 1;
  }
}

.hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.75) 100%);
  opacity: 0;
  transition: opacity 0.25s ease;
  z-index: 2;
}

.series-card.compact:hover .hover-overlay {
  opacity: 1;
}

.pill-sub-content {
  font-size: 0.7rem;
  min-width: 0;
}

@media (max-width: 959.98px) {
  .pill-sub-content {
    font-size: 0.6rem;
  }
}

@media (max-width: 599.98px) {
  .pill-sub-content {
    font-size: 0.5rem;
  }
}
</style>
