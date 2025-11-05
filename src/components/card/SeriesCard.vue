<template>
  <v-tooltip :text="seriesName" location="top center">
    <template v-slot:activator="{ props }">
      <v-card
        v-bind="props"
        class="series-card d-flex flex-column flex-grow-1"
        :class="{ 'glass-card': hasBackgroundImage, 'compact': isCompact }"
        hover
        :to="{ name: 'SeriesDetail', params: { seriesId: seriesData.id } }"
        variant="flat"
        rounded="3md"
      >
        <div class="image-wrapper">
          <v-img
            :src="iconUrl"
            aspect-ratio="1"
            cover
            rounded="3md"
            lazy-src="/empty-placehold.webp"
            class="series-image"
          >
            <template #placeholder>
              <div class="d-flex align-center justify-center fill-height">
                <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
              </div>
            </template>
            <template #error>
              <v-img src="/placehold.webp" aspect-ratio="1" cover rounded="3md" />
            </template>
          </v-img>

          <!-- Compact 模式下 Hover 時顯示的資訊覆蓋層 -->
          <div v-if="isCompact" class="hover-overlay rounded-3md">
            <div class="overlay-content pa-2">
              <div class="text-caption text-white mb-1">
                <v-icon size="x-small" class="mr-1">mdi-layers-outline</v-icon>
                {{ seriesData.prefixes.join(', ') }}
              </div>
              <div class="text-caption text-white">
                {{ seriesData.latestReleaseDate }}
              </div>
            </div>
          </div>
        </div>

        <div class="card-content">
          <div class="info-section">
            <div
              v-if="!isCompact"
              class="prefixes-line text-truncate"
              :class="isLightWithBg ? 'text-grey-lighten-2' : 'text-grey'"
            >
              <v-icon size="x-small" class="mr-1">mdi-layers-outline</v-icon>
              <span class="text-caption">{{ seriesData.prefixes.join(', ') }}</span>
            </div>

            <p
              class="series-title text-truncate"
              :class="
                isCompact
                  ? 'text-body-2 font-weight-medium'
                  : 'text-subtitle-2 text-sm-subtitle-1 font-weight-medium'
              "
            >
              {{ seriesName }}
            </p>
          </div>

          <div v-if="!isCompact" class="date-section">
            <p class="text-caption" :class="isLightWithBg ? 'text-grey-lighten-2' : 'text-grey'">
              {{ seriesData.latestReleaseDate }}
            </p>
          </div>
        </div>
      </v-card>
    </template>
  </v-tooltip>
</template>

<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useTheme } from 'vuetify'

const props = defineProps({
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
const theme = useTheme()
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const isLightWithBg = computed(() => {
  return hasBackgroundImage.value && theme.global.name.value === 'light'
})

const iconUrl = computed(() => {
  return `series-icons/${props.seriesData.id}.webp`
})
</script>

<style scoped>
.series-card {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.series-card:hover {
  transform: translateY(-6px);
  box-shadow: none;
}

.series-card.compact {
  padding: 8px;
}

.series-card:not(.compact) {
  padding: 12px;
}

.series-card.compact:hover {
  transform: translateY(-4px);
}

.image-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 8px;
}

.series-card.compact .image-wrapper {
  margin-bottom: 6px;
}

.series-image {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.series-card:hover .series-image {
  transform: scale(1.08);
}

.card-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prefixes-line {
  display: flex;
  align-items: center;
  min-height: 18px;
}

.series-title {
  line-height: 1.3;
}

.series-card.compact .series-title {
  line-height: 1.4;
}

.date-section {
  margin-top: auto;
  padding-top: 4px;
}

/* Compact 模式的 Hover 覆蓋層效果 */
.hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.75) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  align-items: flex-end;
}

.series-card.compact:hover .hover-overlay {
  opacity: 1;
}

.overlay-content {
  width: 100%;
}
</style>
