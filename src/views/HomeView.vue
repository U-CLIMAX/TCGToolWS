<template>
  <v-container fluid class="home-view fill-height">
    <div class="home-layout">
      <!-- Left Section -->
      <div class="content-section">
        <div class="title-area">
          <h1 class="main-title">U CLIMAX</h1>
          <p class="sub-title">ws卡查工具</p>
        </div>
      </div>

      <!-- Right Section - Image Display with Coordinate Lines -->
      <div class="visual-section">
        <div class="coordinate-system">
          <div class="counter-area">
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
        </div>
      </div>
    </div>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'

// Demo images
const images = ref([
  'https://picsum.photos/id/10/1920/1080',
  'https://picsum.photos/id/20/1920/1080',
  'https://picsum.photos/id/30/1920/1080',
  'https://picsum.photos/id/40/1920/1080',
  'https://picsum.photos/id/50/1920/1080',
])

const currentIndex = ref(0)

const goToImage = (index) => {
  currentIndex.value = index
}
</script>

<style scoped>
.home-view {
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-layout {
  width: 100%;
  max-width: 1400px; /* Max width for large screens */
  padding: 2rem;
  display: grid;
  grid-template-columns: 1fr 1.5fr; /* Left column takes 1 part, right takes 1.5 */
  align-items: center;
  gap: 2rem;
}

/* Sections */
.content-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.visual-section {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Title Area */
.title-area {
  text-align: left;
}

.main-title {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 700;
  letter-spacing: 0.1em;
  margin: 0;
  color: rgb(var(--v-theme-on-background));
}

.sub-title {
  font-size: clamp(1rem, 2vw, 1.5rem);
  margin: 0.5rem 0 0 0;
  color: rgb(var(--v-theme-on-background));
  opacity: 0.8;
}

/* Counter Area */
.counter-area {
  position: absolute;
  bottom: 20px;
  right: calc(100% + 20px);
}

.counter-container {
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: flex-end;
}

.counter-bar {
  height: 100px;
  width: 50px;
  background-color: rgba(128, 128, 128, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
}

.counter-bar:hover {
  background-color: rgba(128, 128, 128, 0.8);
}

.counter-bar.active {
  width: 200px;
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
  bottom: -25px;
  width: 1px;
  height: calc(100% + 25px);
  background-color: rgb(var(--v-theme-on-background));
}

.horizontal-line {
  position: absolute;
  bottom: 0;
  left: -25px;
  width: calc(100% + 25px);
  height: 1px;
  background-color: rgb(var(--v-theme-on-background));
}

.triangle {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: rgb(var(--v-theme-on-background));
  clip-path: polygon(100% 0, 0 0, 100% 100%);
  bottom: -12px;
  right: calc(100% + 2px);
}

.display-image {
  position: absolute;
  top: 0;
  left: 20px;
  bottom: 20px;
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
@media (max-width: 960px) {
  .home-layout {
    grid-template-columns: 1fr; /* Stack columns */
    text-align: center;
    gap: 4rem; /* Increase gap for vertical stacking */
  }

  .content-section {
    align-items: center; /* Center title area */
  }

  .title-area {
    text-align: center;
  }

  .coordinate-system {
    height: auto;
    padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
    width: 100%;
  }
}

@media (max-width: 600px) {
  .home-layout {
    padding: 1rem;
  }

  .counter-bar {
    height: 40px;
    width: 40px;
  }

  .counter-bar.active {
    width: 160px;
  }
}
</style>