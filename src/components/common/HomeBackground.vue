<template>
  <div class="home-background">
    <div class="solid-background-layer"></div>
    <div id="lottie-animation" class="lottie-animation-layer"></div>
    <div class="glass-layer" :class="{ 'has-blur': isHardwareAccelerated === true }"></div>
    <div class="texture-layer"></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import lottie from 'lottie-web'
import bgAnimationData from '@/assets/animations/bg_anime.json'
import { useHardwareAcceleration } from '@/composables/useHardwareAcceleration'

const { isHardwareAccelerated } = useHardwareAcceleration()

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
  /* Fallback background for when blur is off */
  background: linear-gradient(135deg, rgba(18, 18, 18, 0.4) 0%, rgba(18, 18, 18, 0.6) 100%);
  transition:
    backdrop-filter 0.3s ease,
    background 0.3s ease; /* Smooth transition if check is slow */
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

.glass-layer.has-blur {
  backdrop-filter: blur(160px) saturate(180%) brightness(1.1);
  -webkit-backdrop-filter: blur(160px) saturate(180%);
  /* Background for when blur is on */
  background: linear-gradient(135deg, rgba(18, 18, 18, 0.1) 0%, rgba(18, 18, 18, 0.3) 100%);
}
</style>
