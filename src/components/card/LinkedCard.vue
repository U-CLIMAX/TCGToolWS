<template>
  <v-card
    variant="tonal"
    class="linked-card"
    rounded="lg"
    @click="handleCardClick"
    v-tooltip:top-center="{
      text: card.name,
      disabled: isTouch,
    }"
  >
    <div style="position: relative">
      <div v-if="card.rarity" class="rarity-label">
        {{ card.rarity }}
      </div>
      <v-img
        :src="imageUrl"
        :lazy-src="blurUrl"
        :aspect-ratio="400 / 559"
        rounded="lg"
        cover
        class="preload-img"
      >
        <template #error>
          <v-img src="/placehold.webp" rounded="lg" :aspect-ratio="400 / 559" cover />
        </template>
      </v-img>
    </div>
    <div class="pa-2" style="width: 100%">
      <div class="text-caption text-grey text-truncate">{{ card.id }}</div>
      <div class="text-subtitle-2 font-weight-bold text-truncate" style="height: 24px">
        <span>{{ card.name }}</span>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { getCardUrls } from '@/utils/getCardImage'
import { useDevice } from '@/composables/useDevice'

const props = defineProps({
  card: { type: Object, required: true },
})

const emit = defineEmits(['show-details'])

const { isTouch } = useDevice()
const { base: imageUrl, blur: blurUrl } = getCardUrls(props.card.cardIdPrefix, props.card.id)

const handleCardClick = () => {
  emit('show-details', {
    card: props.card,
    imageUrl: imageUrl,
    blurUrl: blurUrl,
    price: props.card.price,
  })
}
</script>

<style scoped>
.linked-card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.linked-card:hover {
  transform: translateY(-4px);
}

.rarity-label {
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 2px 8px;
  border-radius: 7px;
  font-size: 0.7rem;
  font-weight: bold;
  z-index: 2;
  color: white;
  background-color: rgba(var(--v-theme-primary), 0.85);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
</style>
