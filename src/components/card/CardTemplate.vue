<template>
  <v-card
    class="detail-card d-flex flex-column w-100"
    :class="{ 'glass-card': hasBackgroundImage }"
    variant="flat"
    :rounded="isTableMode ? '2lg' : '5md'"
    @click="handleCardClick"
  >
    <v-hover v-slot="{ isHovering, props: hoverProps }">
      <div :class="isTableMode ? 'ma-1' : 'ma-2'" style="position: relative" v-bind="hoverProps">
        <v-img
          :key="card.id"
          :src="imageUrl"
          :alt="card.id"
          :aspect-ratio="400 / 559"
          cover
          rounded="3md"
          :lazy-src="blurUrl"
          class="preload-img"
        >
          <template #error>
            <v-img src="/placehold.webp" :aspect-ratio="400 / 559" cover rounded="3md" />
          </template>

          <v-fade-transition>
            <div
              v-if="isHovering && !smAndDown && !isTouch"
              class="d-flex flex-row-reverse"
              style="position: absolute; bottom: 8px; right: 8px; opacity: 0.9; gap: 6px"
            >
              <v-btn
                icon="mdi-plus"
                :size="buttonSize"
                variant="flat"
                color="grey-darken-3"
                class="disabled-button"
                :disabled="deckStore.totalCardCount >= 50 && userRole === 0"
                @click.stop="deckStore.addCard(card)"
              ></v-btn>
              <v-btn
                icon="mdi-minus"
                :size="buttonSize"
                variant="flat"
                color="grey-lighten-2"
                class="disabled-button"
                :style="{ visibility: cardCount > 0 ? 'visible' : 'hidden' }"
                @click.stop="deckStore.removeCard(card.id)"
              ></v-btn>
            </div>
          </v-fade-transition>

          <div
            v-if="(isTouch || smAndDown) && !isTableMode"
            class="d-flex justify-center ga-10"
            style="position: absolute; bottom: 8px; left: 8px; right: 8px; opacity: 0.95"
          >
            <v-btn
              variant="flat"
              size="x-small"
              icon="mdi-minus"
              color="grey-lighten-2"
              class="disabled-button"
              :disabled="cardCount === 0"
              @click.stop="cardCount > 0 && deckStore.removeCard(card.id)"
              @mousedown.stop
              @touchstart.stop
            >
            </v-btn>
            <v-btn
              variant="flat"
              size="x-small"
              icon="mdi-plus"
              color="grey-darken-3"
              class="disabled-button"
              :disabled="deckStore.totalCardCount >= 50 && userRole === 0"
              @click.stop="deckStore.addCard(card)"
              @mousedown.stop
              @touchstart.stop
            >
            </v-btn>
          </div>

          <div style="position: absolute; top: 8px; right: 8px">
            <v-avatar
              v-if="cardCount > 0"
              :size="smAndDown ? 'x-small' : 'small'"
              color="primary"
              class="counter-avatar"
              >{{ cardCount }}</v-avatar
            >
          </div>
        </v-img>
      </div>
    </v-hover>

    <div
      v-show="!isTableMode || lgAndUp"
      :class="isTableMode ? 'pa-2' : 'pa-3'"
      class="card-content pt-0"
    >
      <div
        :class="[
          isLightWithBg ? 'text-grey-lighten-2' : 'text-grey',
          'text-caption text-md-body-2 mb-1 text-truncate',
        ]"
      >
        {{ card.id }}
      </div>
      <h3 class="text-subtitle-2 text-md-subtitle-1 text-truncate">{{ card.name }}</h3>
      <v-expand-transition>
        <v-row v-if="!isTableMode" dense class="mt-2 text-center">
          <v-col cols="6" class="pa-0">
            <div :class="[isLightWithBg ? 'text-grey-lighten-2' : 'text-grey', 'text-caption']">
              种类
            </div>
            <div class="text-body-2">{{ card.type }}</div>
          </v-col>
          <v-col cols="6" class="pa-0">
            <div :class="[isLightWithBg ? 'text-grey-lighten-2' : 'text-grey', 'text-caption']">
              灵魂值
            </div>
            <div class="text-body-2">{{ card.soul }}</div>
          </v-col>
          <v-col cols="6" class="pa-0 pt-1">
            <div :class="[isLightWithBg ? 'text-grey-lighten-2' : 'text-grey', 'text-caption']">
              等级
            </div>
            <div class="text-body-2">{{ card.level }}</div>
          </v-col>
          <v-col cols="6" class="pa-0 pt-1">
            <div :class="[isLightWithBg ? 'text-grey-lighten-2' : 'text-grey', 'text-caption']">
              战斗力
            </div>
            <div class="text-body-2">{{ card.power }}</div>
          </v-col>
        </v-row>
      </v-expand-transition>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import { storeToRefs } from 'pinia'
import { useCardImage } from '@/composables/useCardImage.js'
import { useAuthStore } from '@/stores/auth'
import { useDeckStore } from '@/stores/deck'
import { useUIStore } from '@/stores/ui'
import { useDevice } from '@/composables/useDevice'

const props = defineProps({
  card: { type: Object, required: true },
  isTableMode: { type: Boolean, default: false },
})

const emit = defineEmits(['show-details'])

const authStore = useAuthStore()
const { userRole } = storeToRefs(authStore)
const deckStore = useDeckStore()
const uiStore = useUIStore()
const { smAndDown, lgAndUp } = useDisplay()
const { isTouch } = useDevice()
const theme = useTheme()
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const isLightWithBg = computed(() => {
  return hasBackgroundImage.value && theme.global.name.value === 'light'
})

const { base: imageUrl, blur: blurUrl } = useCardImage(
  computed(() => props.card.cardIdPrefix),
  computed(() => props.card.id)
)
const cardCount = computed(() => deckStore.getCardCount(props.card.id))
const buttonSize = computed(() =>
  (uiStore.isFilterOpen && uiStore.isCardDeckOpen) || smAndDown.value ? 'x-small' : 'small'
)

const handleCardClick = () => {
  if (!props.card) return
  emit('show-details', {
    card: props.card,
    imageUrl: imageUrl.value,
    blurUrl: blurUrl.value,
  })
}
</script>

<style scoped>
.detail-card {
  transition: transform 0.2s ease-in-out;
  overflow: hidden;
}

.detail-card:hover {
  transform: translateY(-6px);
}

.card-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.counter-avatar {
  border: 2px solid white;
}

.disabled-button.v-btn--disabled {
  pointer-events: auto;
  cursor: default;
}
</style>
