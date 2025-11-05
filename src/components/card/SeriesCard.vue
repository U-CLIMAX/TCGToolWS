<template>
  <v-tooltip :text="seriesName" location="top center">
    <template v-slot:activator="{ props }">
      <v-card
        v-bind="props"
        class="series-card d-flex flex-column flex-grow-1 overflow-hidden"
        :class="[
          { 'glass-card': hasBackgroundImage, 'compact': isCompact },
          isCompact ? 'pa-2' : 'pa-3',
        ]"
        hover
        :to="{ name: 'SeriesDetail', params: { seriesId: seriesData.id } }"
        variant="flat"
        rounded="3md"
      >
        <div class="image-wrapper position-relative overflow-hidden rounded-3md mb-2">
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
          <div v-if="isCompact" class="hover-overlay rounded-3md d-flex align-end">
            <div class="overlay-content pa-2 w-100">
              <div class="text-caption text-white text-truncate mb-1">
                <v-icon size="x-small" class="mr-1">mdi-layers-outline</v-icon>
                {{ seriesData.prefixes.join(', ') }}
              </div>
              <div class="text-caption text-white">
                {{ seriesData.latestReleaseDate }}
              </div>
            </div>
          </div>
        </div>

        <!-- card-content -->
        <div class="card-content d-flex flex-column flex-grow-1 ga-1">
          <!-- info-section -->
          <div class="d-flex flex-column ga-1">
            <!-- prefixes-line -->
            <div
              v-if="!isCompact"
              class="text-truncate d-flex align-center"
              :class="isLightWithBg ? 'text-grey-lighten-2' : 'text-grey'"
              style="min-height: 18px"
            >
              <v-icon size="x-small" class="mr-1">mdi-layers-outline</v-icon>
              <span class="text-caption text-truncate">{{ seriesData.prefixes.join(', ') }}</span>
            </div>

            <!-- series-title -->
            <p
              class="text-truncate"
              :class="
                isCompact
                  ? 'text-body-2 font-weight-medium'
                  : 'text-subtitle-2 text-sm-subtitle-1 font-weight-medium'
              "
              style="iscompact? 'line-height: 1.4' : 'line-height: 1.3'"
            >
              {{ seriesName }}
            </p>
          </div>

          <div v-if="!isCompact" class="date-section mt-auto pt-1">
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
}

.series-card:hover {
  transform: translateY(-6px);
  box-shadow: none;
}

.series-card.compact:hover {
  transform: translateY(-4px);
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
}

.series-card.compact:hover .hover-overlay {
  opacity: 1;
}
</style>
