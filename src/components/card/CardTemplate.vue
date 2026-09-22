<template>
  <div
    class="detail-card d-flex flex-column w-100 rounded-2lg"
    :class="{ 'glass-card': hasBackgroundImage }"
    role="button"
    tabindex="0"
    @click="handleCardClick"
  >
    <div class="ma-1" style="position: relative">
      <CardImage :card="card" rounded="3md" class="preload-img">
        <!-- 浮动操作按钮 -->
        <div
          v-if="!smAndDown && !isTouch && !isGlobalSearch"
          class="card-actions d-flex flex-row-reverse"
        >
          <button
            type="button"
            class="card-action-btn card-action-btn--add"
            :class="{ 'is-disabled': isDeckFull }"
            :disabled="isDeckFull"
            aria-label="增加卡片"
            @click.stop="emit('add-card', card)"
          >
            <span class="i-mdi:plus"></span>
          </button>
          <button
            type="button"
            class="card-action-btn card-action-btn--remove"
            :style="{ visibility: cardCount > 0 ? 'visible' : 'hidden' }"
            aria-label="减少卡片"
            @click.stop="emit('remove-card', card.id)"
          >
            <span class="i-mdi:minus"></span>
          </button>
        </div>

        <!-- 数量徽章 -->
        <div v-if="cardCount > 0 && !isGlobalSearch" class="card-counter-badge-wrapper">
          <span
            class="counter-avatar"
            :class="smAndDown ? 'counter-avatar--xs' : 'counter-avatar--sm'"
          >
            {{ cardCount }}
          </span>
        </div>
      </CardImage>
    </div>

    <div v-show="!isTableMode || !smAndDown" class="card-content pt-0 pa-2">
      <div class="d-flex justify-space-between align-center mb-1">
        <div class="text-caption text-medium-emphasis text-md-body-2 text-truncate">
          {{ card.id }}
        </div>
        <div
          v-if="cardPrice"
          class="text-body-2 font-weight-bold font-DINCond text-primary text-truncate"
        >
          {{ cardPrice }} 円
        </div>
      </div>
      <h3 class="text-subtitle-2 text-md-subtitle-1 text-truncate">{{ card.name }}</h3>

      <!-- 卡片属性区域：纯 CSS Grid 0fr->1fr 平滑过渡 -->
      <div class="card-stats-wrapper" :class="{ 'is-collapsed': isTableMode }">
        <div class="card-stats-inner">
          <div class="card-stats-grid pt-2 text-center">
            <div class="pa-0">
              <div class="text-caption text-disabled font-weight-light">种类</div>
              <div class="text-body-2 font-weight-medium">{{ card.type }}</div>
            </div>
            <div class="pa-0">
              <div class="text-caption text-disabled font-weight-light">灵魂值</div>
              <div class="text-body-2 font-weight-medium">{{ card.soul }}</div>
            </div>
            <div class="pa-0 pt-1">
              <div class="text-caption text-disabled font-weight-light">等级</div>
              <div class="text-body-2 font-weight-medium">{{ card.level }}</div>
            </div>
            <div class="pa-0 pt-1">
              <div class="text-caption text-disabled font-weight-light">战斗力</div>
              <div class="text-body-2 font-weight-medium">{{ card.power }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CardImage from '@/components/card/CardImage.vue'

const props = defineProps({
  card: { type: Object, required: true },
  isTableMode: { type: Boolean, default: false },
  cardCount: { type: Number, default: 0 },
  cardPrice: { type: String, default: null },
  isDeckFull: { type: Boolean, default: false },
  cardClickMode: { type: String, default: 'none' },
  hasBackgroundImage: { type: Boolean, default: false },
  isTouch: { type: Boolean, default: false },
  smAndDown: { type: Boolean, default: false },
})

const emit = defineEmits(['show-details', 'add-card', 'remove-card', 'deck-full'])

const route = useRoute()
const isGlobalSearch = computed(() => route?.name === 'GlobalSearch')

const handleCardClick = () => {
  if (!props.card) return

  if (props.cardClickMode === 'add') {
    if (props.isDeckFull) {
      emit('deck-full')
    } else {
      emit('add-card', props.card)
    }
  } else if (props.cardClickMode === 'remove') {
    emit('remove-card', props.card.id)
  } else {
    emit('show-details', {
      card: props.card,
      price: props.cardPrice,
    })
  }
}
</script>

<style scoped>
.detail-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 380px;
  position: relative;
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  transition:
    transform 0.2s ease-in-out,
    box-shadow 0.2s ease-in-out;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
}

@media (hover: hover) {
  .detail-card:hover {
    transform: translateY(-6px);
    box-shadow:
      0 3px 1px -2px rgba(0, 0, 0, 0.2),
      0 2px 2px 0 rgba(0, 0, 0, 0.14),
      0 1px 5px 0 rgba(0, 0, 0, 0.12);
  }

  .detail-card:hover .card-actions {
    opacity: 0.9;
    pointer-events: auto;
  }
}

.card-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
  gap: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 5;
}

.card-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 18px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  transition:
    transform 0.1s ease,
    background-color 0.15s ease,
    opacity 0.15s ease;
}

.card-action-btn:active {
  transform: scale(0.92);
}

.card-action-btn--add {
  background-color: #424242;
  color: #ffffff;
}

.card-action-btn--remove {
  background-color: #e0e0e0;
  color: #212121;
}

.card-action-btn.is-disabled {
  opacity: 0.6;
  cursor: default;
  pointer-events: auto;
}

.card-counter-badge-wrapper {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
}

.counter-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: bold;
  border: 2px solid white;
  user-select: none;
}

.counter-avatar--sm {
  width: 28px;
  height: 28px;
  font-size: 12px;
}

.counter-avatar--xs {
  width: 20px;
  height: 20px;
  font-size: 10px;
}

.card-stats-wrapper {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  transition:
    grid-template-rows 0.24s cubic-bezier(0.2, 0, 0, 1),
    opacity 0.2s ease-out;
}

.card-stats-wrapper.is-collapsed {
  grid-template-rows: 0fr;
  opacity: 0;
  pointer-events: none;
}

.card-stats-inner {
  overflow: hidden;
  min-height: 0;
  transform: translateY(0);
  transition: transform 0.24s cubic-bezier(0.2, 0, 0, 1);
}

.card-stats-wrapper.is-collapsed .card-stats-inner {
  transform: translateY(-8px);
}

.card-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}

.card-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
</style>
