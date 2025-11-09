<template>
  <v-container fluid class="home-view fill-height">
    <div class="home-background">
      <div class="solid-background-layer"></div>
      <div id="lottie-animation" class="lottie-animation-layer"></div>
      <div class="glass-layer"></div>
      <div class="texture-layer"></div>
    </div>
    <div class="home-layout">
      <!-- Left Section -->
      <div class="content-section">
        <div class="title-area">
          <h1 class="main-title">U CLIMAX</h1>
          <p class="sub-title">ws卡查工具</p>
        </div>

        <!-- Desktop Counter -->
        <div class="counter-area d-none d-md-block">
          <div class="counter-container">
            <div
              v-for="(image, index) in images"
              :key="index"
              class="counter-bar"
              :class="{ active: currentIndex === index }"
              @click="goToImage(index)"
            ></div>
          </div>
        </div>
      </div>

      <!-- Right Section - Image Display with Coordinate Lines -->
      <div class="visual-section">
        <div class="coordinate-system">
          <!-- Vertical Line -->
          <div class="vertical-line"></div>
          <!-- Horizontal Line -->
          <div class="horizontal-line"></div>
          <!-- Triangle -->
          <div class="triangle"></div>

          <!-- Image Display -->
          <transition name="fade" mode="out-in">
            <v-img
              :key="currentIndex"
              :src="images[currentIndex]"
              class="display-image"
              cover
            ></v-img>
          </transition>

          <!-- Mobile Counter -->
          <div class="counter-area d-block d-md-none">
            <div class="counter-container">
              <div
                v-for="(image, index) in images"
                :key="index"
                class="counter-bar"
                :class="{ active: currentIndex === index }"
                @click="goToImage(index)"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import lottie from 'lottie-web'
import bgAnimationData from '@/assets/animations/bg_anime.json'

const images = ref([
  '/intro/series_card_list.webp',
  '/intro/features_intro.webp',
  '/intro/single_card.webp',
  '/intro/deck_features.webp',
])

const currentIndex = ref(0)
let intervalId = null

const nextImage = () => {
  currentIndex.value = (currentIndex.value + 1) % images.value.length
}

const startAutoScroll = () => {
  stopAutoScroll() // Ensure no multiple intervals are running
  intervalId = setInterval(nextImage, 5000) // Change image every 5 seconds
}

const stopAutoScroll = () => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

const goToImage = (index) => {
  currentIndex.value = index
  startAutoScroll() // Reset timer on manual navigation
}

onMounted(() => {
  lottie.loadAnimation({
    container: document.getElementById('lottie-animation'),
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData: bgAnimationData,
  })
  startAutoScroll()
})

onUnmounted(() => {
  stopAutoScroll()
})
</script>

<style scoped>
.home-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: -1; /* Ensure it's behind the content */
}

.solid-background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #232323; /* Solid background color */
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
  background: rgba(var(--v-theme-surface), 0.2); /* Semi-transparent overlay */
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

.home-view {
  --axis-gap: clamp(1rem, 2vw, 1.5rem);
  --axis-cross-length: clamp(1.3rem, 2.5vw, 2rem);
  --mobile-counter-gap: clamp(2rem, 6vw, 3rem);
  --mobile-counter-height-tablet: 60px;
  --mobile-counter-height-phone: 40px;

  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative; /* Ensure content is above background */
  z-index: 0; /* Ensure content is above background */
  background: none; /* Remove default background */
}

.home-layout {
  width: 100%;
  max-width: 1400px; /* Max width for large screens */
  padding: 2rem;
  display: grid;
  grid-template-columns: 1fr 1.5fr; /* Left column takes 1 part, right takes 1.5 */
  align-items: start; /* Align items to the top */
  gap: var(--axis-gap);
  margin: 0 auto; /* Center the layout when max-width is applied */
  position: relative;
}

/* Sections */
.content-section {
  display: flex;
  flex-direction: column;
  height: 100%; /* Ensure section takes full height of grid row */
}

.visual-section {
  display: flex;
  justify-content: center;
}

/* Title Area */
.title-area {
  text-align: left;
}

.main-title {
  font-size: clamp(2rem, 4vw, 3rem); /* Smaller font size */
  font-family: 'DIN';
  transform-origin: left;
  transform: scaleX(0.95);
  margin: 0;
  color: rgb(var(--v-theme-on-background));
  white-space: nowrap; /* Prevent wrapping */
  overflow: hidden; /* Hide overflow */
  text-overflow: ellipsis; /* Show ellipsis for overflowed text */
  line-height: 1.1;
  opacity: 1; /* Keep the element opaque as a whole */
  -webkit-text-stroke: 1px rgb(var(--v-theme-on-background)); /* Set an opaque stroke. */
  color: rgba(
    var(--v-theme-on-background),
    0.8
  ); /* Set the text color (Fill) to 0.8 transparency. */
}

.sub-title {
  font-size: clamp(1.4rem, 2.8vw, 2.1rem);
  font-weight: 100;
  font-family: 'DIN';
  margin: 0.5rem 0 0 0;
  color: white;
  opacity: 1;
  margin-top: 0px;
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.1);
}

/* Desktop Counter */
.content-section .counter-area {
  margin-top: auto; /* Push counter to the bottom of the flex container */
  margin-bottom: var(--axis-gap); /* Align with image bottom */
}

.content-section .counter-container {
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: flex-end;
  width: 100%;
}

.content-section .counter-bar {
  width: 50px; /* Fixed width for non-active bars */
  flex-shrink: 0; /* Prevent shrinking */
  height: 100px;
  background-color: rgba(128, 128, 128, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
}

.content-section .counter-bar:hover {
  background-color: rgba(128, 128, 128, 0.8);
}

.content-section .counter-bar.active {
  flex-grow: 1; /* Allow active bar to grow and fill space */
  width: auto; /* Width is now flexible */
  background-color: rgba(255, 255, 255, 0.9);
}

/* Coordinate System */
.coordinate-system {
  position: relative;
  height: 60vh;
  aspect-ratio: 16 / 9;
  width: 100%;
  max-width: 100%;
}

.vertical-line {
  position: absolute;
  left: 0;
  bottom: calc(-1 * var(--axis-cross-length));
  width: 1px;
  height: calc(100% + var(--axis-cross-length));
  background-color: rgb(var(--v-theme-on-background));
  transition: height 0.3s ease;
}

.horizontal-line {
  position: absolute;
  bottom: 0;
  left: calc(-1 * var(--axis-cross-length));
  width: calc(100% + var(--axis-cross-length));
  height: 1px;
  background-color: rgb(var(--v-theme-on-background));
}

.triangle {
  position: absolute;
  width: calc(var(--axis-cross-length) * 0.3);
  height: calc(var(--axis-cross-length) * 0.3);
  background-color: rgb(var(--v-theme-on-background));
  clip-path: polygon(100% 0, 0 0, 100% 100%);
  bottom: calc(var(--axis-cross-length) * -0.3 - 2px);
  right: calc(100% + 2px);
}

.display-image {
  position: absolute;
  top: 0;
  left: var(--axis-gap);
  bottom: var(--axis-gap);
  right: 0;
  width: auto;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive adjustments */
@media (max-width: 959.98px) {
  .home-layout {
    grid-template-columns: 1fr; /* Stack columns */
    gap: 2rem;
    padding-bottom: calc(
      var(--mobile-counter-gap) + var(--mobile-counter-height-tablet) + 2rem
    ); /* Make space for counter */
  }

  .content-section {
    height: auto; /* Reset height */
  }

  .title-area {
    text-align: left; /* Align title to the left */
  }

  .coordinate-system {
    height: auto;
    padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
    width: 100%;
    --w-tablet: calc(var(--mobile-counter-height-tablet) / 2.5);
    --w-active-tablet: calc(var(--w-tablet) * 4);
  }

  /* Mobile Counter Styles */
  .coordinate-system .counter-area {
    position: absolute;
    bottom: calc(-1 * (var(--mobile-counter-gap) + var(--mobile-counter-height-tablet)));
    left: var(--axis-gap); /* Align with image left */
    transform: none; /* Remove centering transform */
  }

  .coordinate-system .counter-container {
    display: flex;
    gap: calc(var(--mobile-counter-height-tablet) * 0.15);
    /* Width is now fully dynamic based on content */
  }

  .coordinate-system .counter-bar {
    width: var(--w-tablet);
    height: var(--mobile-counter-height-tablet);
    background-color: rgba(128, 128, 128, 0.5);
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .coordinate-system .counter-bar.active {
    width: var(--w-active-tablet);
    background-color: rgba(255, 255, 255, 0.9);
  }

  .vertical-line {
    top: 0; /* Re-anchor to the top */
    bottom: auto; /* Remove bottom anchor */
    height: calc(100% + var(--mobile-counter-gap) + var(--mobile-counter-height-tablet));
  }

  .horizontal-line {
    left: calc(-1 * var(--axis-cross-length));
    width: calc(100% + var(--axis-cross-length) + 3rem); /* Extending to the edge of the screen */
  }
}

@media (max-width: 599.98px) {
  .home-layout {
    padding: 1rem;
    padding-bottom: calc(
      var(--mobile-counter-gap) + var(--mobile-counter-height-phone) + 1rem
    ); /* Keep space for counter */
  }

  .coordinate-system {
    --w-phone: calc(var(--mobile-counter-height-phone) / 2.5);
    --w-active-phone: calc(var(--w-phone) * 4);
  }

  /* Adjust mobile counter for smaller screens */
  .coordinate-system .counter-container {
    gap: calc(var(--mobile-counter-height-phone) * 0.15);
    /* Width is dynamic */
  }

  .coordinate-system .counter-bar {
    width: var(--w-phone);
    height: var(--mobile-counter-height-phone);
  }

  .coordinate-system .counter-bar.active {
    width: var(--w-active-phone);
  }

  .coordinate-system .counter-area {
    bottom: calc(-1 * (var(--mobile-counter-gap) + var(--mobile-counter-height-phone)));
  }

  .vertical-line {
    height: calc(100% + var(--mobile-counter-gap) + var(--mobile-counter-height-phone));
  }
}
</style>
