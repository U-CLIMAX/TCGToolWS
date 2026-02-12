<template>
  <div class="pa-4 pt-0 d-flex flex-column align-center justify-center my-2 w-100">
    <!-- Top Row: Summary & Breakdown -->
    <div class="d-flex flex-row align-center w-100">
      <!-- Left Column: Summary -->
      <div class="d-flex flex-column align-center justify-center px-2" style="flex: 1">
        <div
          class="text-h2 font-DINCond font-weight-black mb-1"
          :class="avgRating >= 4.8 ? rainbowText : 'text-primary'"
        >
          {{ avgRating.toFixed(1) }}
        </div>
        <v-rating
          :model-value="avgRating"
          density="compact"
          color="amber"
          half-increments
          readonly
          size="small"
          class="mb-1"
        ></v-rating>
        <div class="text-caption text-medium-emphasis">{{ ratingCount }} 人评分</div>
      </div>

      <v-divider vertical class="my-2"></v-divider>

      <!-- Right Column: Breakdown Bars -->
      <div class="d-flex flex-column justify-center px-2 ga-1" style="flex: 2; min-width: 180px">
        <div v-for="i in 5" :key="i" class="d-flex align-center w-100" style="height: 18px">
          <span class="text-caption text-medium-emphasis mr-2 font-weight-bold" style="width: 12px">
            {{ 6 - i }}
          </span>
          <v-progress-linear
            :model-value="ratingCount > 0 ? (ratingBreakdown[5 - i] / ratingCount) * 100 : 0"
            color="amber"
            height="6"
            rounded
            class="flex-grow-1"
          ></v-progress-linear>
          <span class="text-caption text-medium-emphasis ml-2 text-end" style="width: 24px">
            {{ ratingBreakdown[5 - i] }}
          </span>
        </div>
      </div>
    </div>

    <!-- Bottom Row: User Rating -->
    <div class="d-flex flex-column align-center mt-3 w-100">
      <div class="text-caption text-medium-emphasis">您的评分</div>
      <v-rating
        v-model="myRating"
        density="compact"
        color="amber"
        hover
        clearable
        size="x-large"
        @update:model-value="handleRate"
      ></v-rating>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useDecksGalleryStore } from '@/stores/decksGallery'
import { useSnackbar } from '@/composables/useSnackbar'

const props = defineProps({
  deckKey: {
    type: String,
    required: true,
  },
  initialAvgRating: {
    type: Number,
    default: 0,
  },
  initialRatingCount: {
    type: Number,
    default: 0,
  },
  initialRatingBreakdown: {
    type: Array,
    default: () => [0, 0, 0, 0, 0],
  },
})

const authStore = useAuthStore()
const galleryStore = useDecksGalleryStore()
const uiStore = useUIStore()
const { triggerSnackbar } = useSnackbar()

const myRating = ref(0)
const avgRating = ref(props.initialAvgRating)
const ratingCount = ref(props.initialRatingCount)
const ratingBreakdown = ref(props.initialRatingBreakdown)
const rainbowText = computed(() => {
  return uiStore.theme === 'dark' ? 'text-rainbow-dark' : 'text-rainbow-light'
})

watch(
  () => [props.initialAvgRating, props.initialRatingCount, props.initialRatingBreakdown],
  ([newAvg, newCount, newBreakdown]) => {
    avgRating.value = newAvg
    ratingCount.value = newCount
    ratingBreakdown.value = newBreakdown
  }
)

watch(
  () => props.deckKey,
  async (newKey) => {
    if (newKey && authStore.isAuthenticated) {
      myRating.value = await galleryStore.fetchMyRating(newKey)
    } else {
      myRating.value = 0
    }
  },
  { immediate: true }
)

const handleRate = async (val) => {
  if (!authStore.isAuthenticated) {
    triggerSnackbar('请先登录', 'warning')
    myRating.value = 0
    return
  }
  const ratingValue = val || 0
  try {
    const result = await galleryStore.rateDeck(props.deckKey, ratingValue)
    avgRating.value = result.rating_avg
    ratingCount.value = result.rating_count
    ratingBreakdown.value = result.rating_breakdown
    myRating.value = ratingValue
    triggerSnackbar(ratingValue === 0 ? '评分已删除' : '评分成功', 'success')
  } catch (error) {
    triggerSnackbar(error.message, 'error')
  }
}
</script>

<style scoped>
.text-rainbow-dark {
  background: var(--rainbow-gradirnt-dark);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-loop 3s linear infinite;
}

.text-rainbow-light {
  background: var(--rainbow-gradirnt-light);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-loop 3s linear infinite;
}
</style>
