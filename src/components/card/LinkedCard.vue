<template>
  <v-card
    variant="tonal"
    class="linked-card"
    rounded="lg"
    @click="handleCardClick"
    v-tooltip:top-center="card.name"
  >
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
    <div class="pa-2" style="width: 100%">
      <div class="text-caption text-grey text-truncate">{{ card.id }}</div>
      <div class="text-subtitle-2 font-weight-bold text-truncate" style="height: 24px">
        <span>{{ card.name }}</span>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useCardImage } from '@/composables/useCardImage.js'

const props = defineProps({
  card: { type: Object, required: true },
})

const emit = defineEmits(['show-details'])

const cardId = computed(() => props.card.id)
const cardIdPrefix = computed(() => props.card.cardIdPrefix)

const { base: imageUrl, blur: blurUrl } = useCardImage(cardIdPrefix, cardId)

const handleCardClick = () => {
  emit('show-details', {
    card: props.card,
    imageUrl: imageUrl.value,
    blurUrl: blurUrl.value,
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
</style>
