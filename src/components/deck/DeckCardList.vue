<template>
  <div>
    <div class="px-4 pb-4 w-100 h-100 centered-content">
      <v-fab-transition>
        <DeckStatsDashboard
          v-if="uiStore.showStatsDashboard"
          :grouped-cards="statsGroupedCards"
          :group-by="groupBy"
        />
      </v-fab-transition>

      <v-fade-transition>
        <div v-show="showCards" :class="{ 'd-none': !showCards }">
          <div v-for="([groupName, group], index) in displayGroupedCards" :key="groupName">
            <div
              class="d-flex align-center text-subtitle-2 text-disabled mb-1 ga-1"
              :class="{ 'mt-3': index > 0 }"
            >
              <span :class="isLightWithBg ? 'text-grey-lighten-2' : 'text-grey-darken-4'">
                {{ getGroupName(groupName) }}</span
              >
              <v-chip
                size="small"
                variant="tonal"
                :color="chipColor1"
                rounded="circle"
                style="aspect-ratio: 1"
                class="mr-3 d-inline-flex align-center justify-center"
              >
                {{ group.reduce((sum, item) => sum + item.quantity, 0) }}
              </v-chip>

              <!-- 魂標數量 chip -->
              <v-chip size="small" variant="tonal" :color="chipColor2" label>
                <template #prepend>
                  <v-img
                    :src="WsIcon"
                    alt="Back to top"
                    width="14"
                    aspect-ratio="1"
                    draggable="false"
                    class="mr-1"
                    :style="{ filter: iconFilterStyle }"
                  />
                </template>
                {{
                  group.reduce(
                    (sum, item) => sum + item.quantity * (item.trigger_soul_count || 0),
                    0
                  )
                }}
              </v-chip>
            </div>
            <v-row dense class="ma-0">
              <v-col v-for="item in group" :key="item.id" cols="4" sm="3" md="2">
                <v-tooltip :text="item.id" location="top center">
                  <template v-slot:activator="{ props }">
                    <div
                      v-bind="props"
                      class="card-container deck-detail-card"
                      :class="{
                        'diff-added': item.diffStatus === 'added',
                        'diff-removed': item.diffStatus === 'removed',
                      }"
                      @click="$emit('card-click', item)"
                    >
                      <v-img
                        :src="useCardImage(item.cardIdPrefix, item.id).value"
                        :aspect-ratio="400 / 559"
                        cover
                        lazy-src="/empty-placehold.webp"
                        rounded="3md"
                      >
                        <template #placeholder>
                          <div class="d-flex align-center justify-center fill-height">
                            <v-progress-circular
                              color="grey-lighten-4"
                              indeterminate
                            ></v-progress-circular>
                          </div>
                        </template>
                        <template #error>
                          <v-img src="/placehold.webp" :aspect-ratio="400 / 559" cover />
                        </template>
                      </v-img>
                      <div
                        class="quantity-badge"
                        :class="{
                          'diff-increased': item.diffStatus === 'increased',
                          'diff-decreased': item.diffStatus === 'decreased',
                        }"
                      >
                        {{ item.quantity }}
                      </div>
                    </div>
                  </template>
                </v-tooltip>
              </v-col>
            </v-row>
          </div>
        </div>
      </v-fade-transition>
    </div>

    <v-dialog
      v-if="selectedCard"
      :model-value="isModalVisible"
      @update:model-value="$emit('update:isModalVisible', $event)"
      :fullscreen="xs"
      :max-width="smAndDown ? undefined : '60%'"
      :max-height="smAndDown ? undefined : '95%'"
      :min-height="smAndDown ? undefined : '60%'"
    >
      <CardDetailModal
        :card="selectedCard"
        :imgUrl="modalCardImageUrl"
        :linkedCards="linkedCards"
        :showActions="false"
        :card-index="selectedCardIndex"
        :total-cards="totalCards"
        @close="$emit('update:isModalVisible', false)"
        @show-new-card="$emit('show-new-card', $event)"
        @prev-card="$emit('prev-card')"
        @next-card="$emit('next-card')"
      />
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useDisplay } from 'vuetify'
import { useCardImage } from '@/composables/useCardImage.js'
import CardDetailModal from '@/components/card/CardDetailModal.vue'
import DeckStatsDashboard from '@/components/deck/DeckStatsDashboard.vue'
import WsIcon from '@/assets/ui/ws-icon.svg?url'
import { useUIStore } from '@/stores/ui'

const props = defineProps({
  displayGroupedCards: {
    type: Map,
    required: true,
  },
  statsGroupedCards: {
    type: Map,
    required: true,
  },
  groupBy: {
    type: String,
    required: true,
  },
  isLightWithBg: {
    type: Boolean,
    default: false,
  },
  selectedCard: {
    type: Object,
    default: null,
  },
  isModalVisible: {
    type: Boolean,
    default: false,
  },
  linkedCards: {
    type: Array,
    default: () => [],
  },
  selectedCardIndex: {
    type: Number,
    default: -1,
  },
  totalCards: {
    type: Number,
    default: 0,
  },
  chipColor1: {
    type: String,
    default: 'green-accent-4',
  },
  chipColor2: {
    type: String,
    default: 'orange-accent-4',
  },
})

defineEmits(['card-click', 'update:isModalVisible', 'show-new-card', 'prev-card', 'next-card'])

const { xs, smAndDown } = useDisplay()
const theme = useTheme()
const uiStore = useUIStore()

const showCards = ref(true)

watch(
  () => uiStore.showStatsDashboard,
  () => {
    showCards.value = false
    setTimeout(() => {
      showCards.value = true
    }, 300)
  }
)

const iconFilterStyle = computed(() => {
  return theme.global.name.value === 'light' ? 'invert(1)' : 'none'
})

const modalCardImageUrl = computed(() => {
  if (props.selectedCard) {
    return useCardImage(props.selectedCard.cardIdPrefix, props.selectedCard.id).value
  }
  return ''
})

const colorMap = {
  red: '红色',
  blue: '蓝色',
  yellow: '黄色',
  green: '绿色',
}

const getGroupName = (groupName) => {
  switch (props.groupBy) {
    case 'level':
      return groupName === 'CX' ? '高潮卡' : `等级 ${groupName}`
    case 'color':
      return colorMap[groupName.toLowerCase()] || groupName
    case 'cost':
      return `费用 ${groupName}`
    default:
      return groupName
  }
}
</script>

<style scoped>
.card-container {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.card-container:hover {
  transform: translateY(-5px);
}

.quantity-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgb(var(--v-theme-primary));
  color: white;
  border-radius: 12px;
  padding: 0 6px;
  font-size: 0.8rem;
  font-weight: bold;
  border: 2px solid white;
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.centered-content {
  margin: 0 auto;
  max-width: 1200px;
}

.diff-added {
  opacity: 0.68;
}

.diff-removed .v-img {
  filter: grayscale(90%);
}

.quantity-badge.diff-increased {
  background-color: rgb(var(--v-theme-success));
  box-shadow: 0 0 8px 2px rgba(var(--v-theme-success), 0.7);
}

.quantity-badge.diff-decreased {
  background-color: rgb(var(--v-theme-warning));
  box-shadow: 0 0 8px 2px rgba(var(--v-theme-warning), 0.7);
}

@media (max-width: 1200px) {
  .centered-content {
    max-width: 100%;
  }
}
</style>
