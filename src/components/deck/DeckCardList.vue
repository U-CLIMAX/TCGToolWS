<template>
  <div>
    <div class="px-4 pb-4 w-100 h-100 centered-content">
      <v-fab-transition>
        <DeckStatsDashboard
          v-if="uiStore.showStatsDashboard || shouldForceDashboardOpen"
          :grouped-cards="statsGroupedCards"
          :group-by="groupBy"
        />
      </v-fab-transition>

      <v-fade-transition>
        <div v-show="showCards" :class="{ 'd-none': !showCards }">
          <div v-for="([groupName, group], index) in displayGroupedCards" :key="groupName">
            <div class="group-header" :class="{ 'mt-3': index > 0 }">
              <span>
                {{ getGroupName(groupName) }}
              </span>

              <!-- 卡片數量 -->
              <div class="d-flex align-center ga-2">
                <v-icon size="14">mdi-cards</v-icon>
                <span>
                  {{ group.reduce((sum, item) => sum + item.quantity, 0) }}
                </span>
              </div>

              <!-- 魂標數量 -->
              <div class="d-flex align-center ga-2">
                <v-img
                  :src="WsIcon"
                  alt="魂標"
                  width="14"
                  aspect-ratio="1"
                  draggable="false"
                  :style="{ filter: iconFilterStyle }"
                />
                <span>
                  {{
                    group.reduce(
                      (sum, item) => sum + item.quantity * (item.trigger_soul_count || 0),
                      0
                    )
                  }}
                </span>
              </div>
            </div>
            <transition-group tag="div" class="v-row v-row--dense ma-0" name="card-fade" appear>
              <v-col
                v-for="(item, itemIndex) in group"
                :key="item.id"
                cols="4"
                sm="3"
                md="2"
                :style="{ '--stagger-index': itemIndex }"
              >
                <v-tooltip :text="item.id" location="top center" :disabled="isTouch ? true : false">
                  <template v-slot:activator="{ props }">
                    <div
                      v-bind="props"
                      class="card-container deck-detail-card"
                      :class="{
                        'diff-added': item.diffStatus === 'added',
                        'diff-removed': item.diffStatus === 'removed',
                        'diff-increased': item.diffStatus === 'increased',
                        'diff-decreased': item.diffStatus === 'decreased',
                      }"
                      @click="$emit('card-click', item)"
                    >
                      <div
                        v-if="item.diffStatus"
                        class="diff-label"
                        :class="`diff-label-${item.diffStatus}`"
                      >
                        <span v-if="item.diffStatus === 'added'">+新增</span>
                        <span v-else-if="item.diffStatus === 'removed'">-移除</span>
                        <span v-else-if="item.diffStatus === 'increased'">↑</span>
                        <span v-else-if="item.diffStatus === 'decreased'">↓</span>
                      </div>
                      <v-img
                        :src="getCardUrls(item.cardIdPrefix, item.id).base"
                        :lazy-src="getCardUrls(item.cardIdPrefix, item.id).blur"
                        :aspect-ratio="400 / 559"
                        cover
                        rounded="3md"
                        class="preload-img"
                      >
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
            </transition-group>
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
        :img-url="modalCardImageUrl.base"
        :blur-url="modalCardImageUrl.blur"
        :linked-cards="linkedCards"
        :is-loading-links="isLoadingLinks"
        :show-actions="false"
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
import { useRoute } from 'vue-router'
import { useTheme } from 'vuetify'
import { useDisplay } from 'vuetify'
import { getCardUrls } from '@/utils/getCardImage'
import { useDevice } from '@/composables/useDevice'
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
  isLoadingLinks: {
    type: Boolean,
    default: false,
  },
  selectedCardIndex: {
    type: Number,
    default: -1,
  },
  totalCards: {
    type: Number,
    default: 0,
  },
})

defineEmits(['card-click', 'update:isModalVisible', 'show-new-card', 'prev-card', 'next-card'])

const { xs, smAndDown } = useDisplay()
const theme = useTheme()
const uiStore = useUIStore()
const { isTouch } = useDevice()
const route = useRoute()

const shouldForceDashboardOpen = computed(() => {
  return ['DeckLog', 'ShareDeckDetail'].includes(route.name)
})

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
  return theme.global.name.value === 'dark' ? 'none' : 'invert(1)'
})

const modalCardImageUrl = computed(() => {
  if (props.selectedCard) {
    const { base, blur } = getCardUrls(props.selectedCard.cardIdPrefix, props.selectedCard.id)
    return {
      base: base,
      blur: blur,
    }
  }

  return { base: '/empty-placehold.webp', blur: '/empty-placehold.webp' }
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
.group-header {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background-color: rgba(var(--v-theme-surface), 0.7);
  backdrop-filter: blur(4px) saturate(180%);
  -webkit-backdrop-filter: blur(4px) saturate(180%); /* Safari 支援 */
  padding: 4px 12px;
  border-radius: 16px;
  margin-bottom: 4px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.875rem;
}

/* 佈局樣式 (Layout Styles) */
.centered-content {
  margin: 0 auto;
  max-width: 1200px;
}

/* 卡片基礎樣式 (Card Base) */
.card-container {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.card-container:hover {
  transform: translateY(-5px);
}

/* 卡片內部元件 (Card Sub-Elements) */

/* 右下角數量標記 (Quantity Badge) */
.quantity-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgb(var(--v-theme-primary));
  color: white;
  border-radius: 50%;
  padding: 0 6px;
  font-size: 1rem;
  font-weight: bold;
  border: 2px solid white !important;
  width: 28px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* 左上角差異標籤 (Diff Label) */
.diff-label {
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
  z-index: 2;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* "增加"和"減少"標籤 (↑/↓) 的共同基礎樣式 (變為圓形) */
.diff-label-increased,
.diff-label-decreased {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

/* 差異比較 - 狀態修改 (Diff Status Modifiers) */

/* 新增 / 增加 (Success / Green) */

/* 容器邊框 */
.diff-added,
.diff-increased {
  border: 2px solid rgb(var(--v-theme-success));
  border-radius: 14px;
}

/* "新增" 獨有的容器樣式 (透明度、光暈) */
.diff-added {
  opacity: 0.68;
  box-shadow: 0 0 12px rgba(var(--v-theme-success), 0.4);
}

/* 數量標記變色 */
.quantity-badge.diff-increased {
  background-color: rgb(var(--v-theme-success));
  box-shadow: 0 0 8px 2px rgba(var(--v-theme-success), 0.7);
}

/* 左上角標籤變色 */
.diff-label-added {
  background-color: rgba(var(--v-theme-success), 0.9);
}
.diff-label-increased {
  background-color: rgba(var(--v-theme-success), 0.9);
}

/* 移除 / 減少 (Error / Red) */

/* 容器邊框 */
.diff-removed,
.diff-decreased {
  border: 2px solid rgb(var(--v-theme-error));
  border-radius: 14px;
}

/* "移除" 獨有的容器樣式 (灰階、斜線) */
.diff-removed .v-img {
  filter: grayscale(90%);
  opacity: 0.5;
}

.diff-removed {
  position: relative; /* 為了 ::after 定位 */
}

/* 移除卡片加上斜線效果 */
.diff-removed::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    45deg,
    transparent 48%,
    rgba(var(--v-theme-error), 0.8) 48%,
    rgba(var(--v-theme-error), 0.8) 52%,
    transparent 52%
  );
  pointer-events: none;
  border-radius: 14px;
}

/* 數量標記變色 */
.quantity-badge.diff-decreased {
  background-color: rgb(var(--v-theme-error));
  box-shadow: 0 0 8px 2px rgba(var(--v-theme-error), 0.7);
}

/* 左上角標籤變色 */
.diff-label-removed {
  background-color: rgba(var(--v-theme-error), 0.9);
}
.diff-label-decreased {
  background-color: rgba(var(--v-theme-error), 0.9);
}

/* 響應式設計 (Responsive) */
@media (max-width: 1200px) {
  .centered-content {
    max-width: 100%;
  }
}

/* 卡片交錯淡入動畫 (Card Staggered Fade-in Animation) */
.card-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  /* 利用 CSS 變數和 calc 函數來計算延遲 */
  transition-delay: calc(0.03s * var(--stagger-index));
}

.card-fade-enter-from {
  opacity: 0;
  transform: scale(0.9);
}
</style>
