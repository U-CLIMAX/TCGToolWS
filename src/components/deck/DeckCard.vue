<template>
  <v-hover v-slot="{ isHovering, props }">
    <div v-bind="props" class="position-relative">
      <v-card
        :to="{ name: 'DeckDetail', params: { key: deckKey } }"
        variant="flat"
        rounded="3md"
        class="deck-card"
        :class="{ 'is-lifted': isHovering && !isTouch }"
      >
        <v-img
          :src="imageUrl"
          class="align-end"
          style="transform: scale(1.1)"
          aspect-ratio="1"
          cover
          position="top"
          lazy-src="/empty-placehold.webp"
        >
          <template #placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
            </div>
          </template>
          <template #error>
            <v-img src="/placehold.webp" aspect-ratio="1" cover />
          </template>

          <div :class="{ 'title-background': !isEditing, 'full-mask': isEditing }"></div>
          <div v-if="isEditing" class="editing-text">编辑中</div>
          <v-card-text class="deck-title" style="z-index: 1">
            {{ deck.name }}
          </v-card-text>
        </v-img>
      </v-card>

      <v-scale-transition>
        <div v-show="(isHovering || isTouch) && imageUrl" class="delete-btn-container">
          <v-btn
            icon
            :variant="isTouch ? 'text' : 'tonal'"
            :size="smAndDown ? 'x-small' : 'small'"
            class="delete-btn"
            color="black"
            @click.prevent="handleDeleteDeck"
          >
            <v-icon color="red-accent-4" style="font-size: clamp(16px, 2vw, 24px)">
              mdi-trash-can-outline
            </v-icon>
          </v-btn>
        </div>
      </v-scale-transition>

      <v-dialog v-model="isDeleteDialogOpen" max-width="400">
        <v-card title="删除卡组">
          <v-card-text>确定要删除卡组 "{{ deck.name }}" 吗？此操作无法撤销。</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text="取消" @click="isDeleteDialogOpen = false"></v-btn>
            <v-btn
              color="pink-accent-3"
              variant="flat"
              text="删除"
              @click="confirmDeleteDeck"
            ></v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </v-hover>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { useCardImage } from '@/composables/useCardImage'
import { useDeckStore } from '@/stores/deck'
import { useDevice } from '@/composables/useDevice'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'

const props = defineProps({
  deck: {
    type: Object,
    required: true,
  },
  deckKey: {
    type: String,
    required: true,
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
})

const deckStore = useDeckStore()
const { isTouch } = useDevice()
const { smAndDown } = useDisplay()
const uiStore = useUIStore()
const { triggerSnackbar } = useSnackbar()

const isDeleteDialogOpen = ref(false)

const coverCard = computed(() => {
  const cards = props.deck?.cards || {}
  const cardsArray = Object.values(cards)
  return (
    cardsArray.find((card) => card.id === props.deck?.coverCardId) ||
    cardsArray.slice().sort((a, b) => a.id - b.id)[0] ||
    null
  )
})

const imageUrl = useCardImage(
  computed(() => coverCard.value.cardIdPrefix),
  computed(() => coverCard.value.id)
)

const isLocalDeck = computed(() => props.deckKey === 'local')

const handleDeleteDeck = () => {
  isDeleteDialogOpen.value = true
}

const confirmDeleteDeck = async () => {
  uiStore.setLoading(true)

  try {
    if (isLocalDeck.value) {
      deckStore.clearDeck()
    } else {
      await deckStore.deleteDeck(props.deckKey)
    }
    isDeleteDialogOpen.value = false
  } catch (error) {
    triggerSnackbar(error.message, 'error')
  } finally {
    uiStore.setLoading(false)
  }
}
</script>

<style scoped>
.deck-card {
  transition: transform 0.2s ease-in-out;
  overflow: hidden;
}

.deck-card.is-lifted {
  transform: translateY(-6px);
}

.delete-btn-container {
  position: absolute;
  top: -2px;
  right: 4px;
  z-index: 2;
}

.deck-title {
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: clamp(0.6rem, 1vw, 1.1rem) !important;
  line-height: 1.3;
  color: white;
}

.title-background {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 20%, transparent 100%);
  pointer-events: none;
}

.full-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  pointer-events: none;
}

.editing-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  font-size: clamp(1rem, 3vw, 1.5rem);
  font-weight: bold;
  white-space: nowrap;
  background: linear-gradient(
    90deg,
    #ffb3ba,
    #ffdfba,
    #ffffba,
    #baffc9,
    #bae1ff,
    #d4baff,
    #ffb3f0,
    #ffb3ba
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: rainbow 3s linear infinite;
}

@keyframes rainbow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}
</style>
