<template>
  <div class="home-background">
    <div class="solid-background-layer"></div>
    <div id="lottie-animation" class="lottie-animation-layer"></div>
    <div class="glass-layer"></div>
    <div class="texture-layer"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import lottie from 'lottie-web'
import bgAnimationData from '@/assets/animations/bg_anime.json'

let anim

onMounted(() => {
  const container = document.getElementById('lottie-animation')
  if (container) {
    anim = lottie.loadAnimation({
      container: container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: bgAnimationData,
    })
  }
})

onUnmounted(() => {
  if (anim) {
    anim.destroy()
  }
})
</script>

<style scoped>
/* --- Base & Background --- */
.home-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: -2; /* Lower z-index to be behind App.vue's background */
}

.solid-background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #232323; /* --color-bg-solid */
}

.lottie-animation-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 600px; /* Smaller width */
  height: 600px; /* Smaller height */
  /* Lottie animation will fill this container */
}

.glass-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(120px) saturate(160%); /* Glass effect */
  -webkit-backdrop-filter: blur(120px) saturate(160%);
  background: rgba(18, 18, 18, 0.2); /* --color-dark-black-rgb */
}

.texture-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('/texture.webp'); /* Texture image */
  background-size: cover;
  background-position: center;
}
</style>
