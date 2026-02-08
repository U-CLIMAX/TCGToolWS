<template>
  <div
    class="splash-overlay"
    :class="{ 'animating-out': status === 'animating-out' }"
    @click="handleClick"
  >
    <div class="content-wrapper">
      <h1 class="animated-title" :class="{ loaded: imageLoaded }">U CLIMAX</h1>
      <p class="click-hint" v-if="status === 'active'">点击进入</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true, // 'active', 'animating-out'
  },
})

const emit = defineEmits(['start-exit', 'animation-finished'])
const imageLoaded = ref(false)

onMounted(() => {
  const img = new Image()
  img.onload = () => {
    imageLoaded.value = true
  }
  img.src = '/intro/series_card_list_blur.webp'
})

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

.content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.animated-title {
  font-family: 'DINCond-Black', sans-serif;
  font-size: clamp(3rem, 10vw, 8rem);
  font-weight: 900;
  text-align: center;
  color: rgba(255, 255, 255, 0.1);
  padding: 0rem 2.5rem;
  transform: scale(1);
  opacity: 0;
  transition:
    transform 1.2s cubic-bezier(0.5, 0, 1, 1),
    opacity 1s ease-out;
}

.animated-title.loaded {
  opacity: 1;
  background-image: url('/intro/series_card_list_blur.webp');
  background-size: cover;
  background-position: center;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.click-hint {
  font-family: 'DINCond-Black', sans-serif;
  font-size: clamp(1rem, 3vw, 1.5rem);
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.3em;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
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

.splash-overlay.animating-out .click-hint {
  opacity: 0;
  transition: opacity 0.3s ease-out;
}
</style>
