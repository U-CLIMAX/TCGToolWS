<template>
  <v-hover v-slot:default="{ isHovering, props }">
    <v-card
      v-bind="props"
      class="series-card d-flex flex-column flex-grow-1 overflow-visible"
      :class="[
        { 'compact': isCompact },
      ]"
      :to="{ name: 'SeriesDetail', params: { seriesId: seriesData.id } }"
      :ripple="false"
      variant="text"
    >
      <div
        class="image-wrapper position-relative"
        :class="isCompact ? 'mb-1 rounded-2lg' : 'mb-2 rounded-xl'"
      >
        <v-img
          :src="`/series-icons/original/${encodeURIComponent(seriesData.id)}.webp`"
          :lazy-src="`/series-icons/blur/${encodeURIComponent(seriesData.id)}.webp`"
          aspect-ratio="1"
          cover
          :rounded="isCompact ? '2lg' : 'xl'"
          class="series-image preload-img"
        >
          <template #error>
            <v-img src="/placehold.webp" aspect-ratio="1" cover rounded="5xl" />
          </template>
        </v-img>

        <!-- Compact 模式下 Hover 時顯示的資訊覆蓋層 -->
        <div v-if="isCompact" class="hover-overlay rounded-2lg d-flex align-end">
          <div class="overlay-content pa-2 w-100">
            <div class="text-caption text-white text-truncate mb-1">
              <v-icon size="x-small" class="mr-1" icon="i-mdi:layers-outline" />
              {{ seriesData.prefixes.join(', ') }}
            </div>
            <div class="text-caption text-white">
              {{ seriesData.latestReleaseDate }}
            </div>
          </div>
        </div>
      </div>

      <!-- pill-content -->
      <v-sheet
        v-if="!isCompact"
        class="pill-content d-flex flex-column px-3 px-sm-6 py-1 mt-auto"
        :class="{ 'glass-card': hasBackgroundImage }"
        :color="hasBackgroundImage ? 'transparent' : 'surface'"
        rounded="pill"
        border
      >
        <div class="pill-sub-content d-flex align-center mb-1">
          <div class="d-flex align-center flex-grow-1 text-medium-emphasis overflow-hidden" style="min-width: 0">
            <v-icon size="x-small" class="mr-1 flex-shrink-0" icon="i-mdi:layers-outline" />
            <div class="text-truncate pr-px">
              {{ seriesData.prefixes.map((p) => p.replace('[cn]', '')).join(', ') }}
            </div>
          </div>
          <div class="text-medium-emphasis ml-2 flex-shrink-0">
            {{ seriesData.latestReleaseDate }}
          </div>
        </div>
        <div
          class="text-truncate font-weight-medium text-subtitle-2"
        >
          {{ seriesName }}
        </div>
      </v-sheet>

      <!-- Compact 模式下的簡易名稱 -->
      <div
        v-else
        class="text-truncate font-weight-medium text-body-2"
      >
        {{ seriesName }}
      </div>
    </v-card>
  </v-hover>
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
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-rendering: geometricPrecision;
  backface-visibility: hidden;
}

.series-card :deep(.v-card__overlay) {
  background-color: transparent;
}

.image-wrapper {
  flex: 0 0 auto;
  aspect-ratio: 1;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 
    0 0 0 1px rgba(0, 0, 0, 0.05),
    0 0 4px rgba(0, 0, 0, 0.08);
    /* In standard mode, setting the outer card to hidden prevents the image from overflowing when zoomed in, but setting it to visible prevents shadows from being clipped. */
    overflow: hidden; 
    will-change: transform;
}

.pill-content {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 
    0 0 0 1px rgba(0, 0, 0, 0.03),
    0 0 4px rgba(0, 0, 0, 0.05);
  will-change: transform;
}

.series-image {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* === Standard Mode Hover === */
.series-card:not(.compact):hover .image-wrapper {
  transform: scale(1.05);
  box-shadow: 
    0 0 0 1px rgba(0, 0, 0, 0.1),
    0 8px 16px rgba(0, 0, 0, 0.15);
}

.series-card:not(.compact):hover .pill-content {
  transform: scale(1.05);
  box-shadow: 
    0 0 0 1px rgba(0, 0, 0, 0.08),
    0 4px 12px rgba(0, 0, 0, 0.1);
}

/* === Compact Mode Hover === */
.series-card.compact:hover {
  transform: translateY(-4px);
}

.series-card.compact:hover .series-image {
  transform: scale(1.08);
}

.series-card.compact .image-wrapper {
  overflow: hidden; /* Ensure the enlarged image is cropped within the container */
}

.hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.75) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
}

.series-card.compact:hover .hover-overlay {
  opacity: 1;
}

.pill-sub-content {
  font-size: 0.7rem;
  min-width: 0
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
