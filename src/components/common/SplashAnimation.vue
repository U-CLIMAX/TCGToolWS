<template>
  <div
    class="splash-overlay"
    :class="{ 'animating-out': status === 'animating-out' }"
    @click="handleClick"
  >
    <h1 class="animated-title">U CLIMAX</h1>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, watch } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true, // 'active', 'animating-out'
  },
})

const emit = defineEmits(['start-exit', 'animation-finished'])

const handleClick = () => {
  if (props.status === 'active') {
    emit('start-exit')
  }
}

watch(
  () => props.status,
  (newStatus) => {
    if (newStatus === 'animating-out') {
      // Corresponds to the animation duration
      setTimeout(() => {
        emit('animation-finished')
      }, 400) // Animation duration is 0.4s
    }
  }
)
</script>

<style scoped>
.splash-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 9999;
  transition: background-color 0.8s ease-in-out;
}

.animated-title {
  font-family: 'DINCond-Black', sans-serif;
  font-size: clamp(3rem, 10vw, 8rem);
  font-weight: 900;
  text-align: center;
  color: transparent;
  padding: 0rem 2.5rem;
  background-image: url('/intro/series_card_list_blur.webp');
  background-size: cover;
  background-position: center;
  -webkit-background-clip: text;
  background-clip: text;
  transform: scale(1);
  opacity: 1;
  transition:
    transform 1.2s cubic-bezier(0.5, 0, 1, 1),
    opacity 1s ease-out;
}

/* Animation states */
.splash-overlay.animating-out {
  background-color: rgba(0, 0, 0, 0);
}

.splash-overlay.animating-out .animated-title {
  transform: scale(500);
  opacity: 0;
  filter: blur(5px) brightness(1);
}
</style>
