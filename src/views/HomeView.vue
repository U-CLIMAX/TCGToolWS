<template>
  <v-container fluid class="home-view fill-height">
    <div class="home-layout">
      <!-- Left Section -->
      <div class="content-section">
        <div class="title-area">
          <h1 class="main-title">U CLIMAX</h1>
          <p class="sub-title">ws卡查工具</p>
        </div>

        <!-- Image Counter (Left Bottom) -->
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
  // 'https://picsum.photos/id/50/1920/1080',
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
  align-items: start; /* Align items to the top */
  gap: 2rem;
  margin: 0 auto; /* Center the layout when max-width is applied */
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
  font-weight: 700;
  letter-spacing: 0.1em;
  margin: 0;
  color: rgb(var(--v-theme-on-background));
  white-space: nowrap; /* Prevent wrapping */
  overflow: hidden; /* Hide overflow */
  text-overflow: ellipsis; /* Show ellipsis for overflowed text */
}

.sub-title {
  font-size: clamp(1rem, 2vw, 1.5rem);
  margin: 0.5rem 0 0 0;
  color: rgb(var(--v-theme-on-background));
  opacity: 0.8;
}

/* Counter Area */
.counter-area {
  margin-top: auto; /* Push counter to the bottom of the flex container */
  padding-bottom: 20px; /* Align with image bottom (image is 20px from axis) */
}

.counter-container {
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: flex-end;
  width: 100%;
}

.counter-bar {
  width: 40px; /* Fixed width for non-active bars */
  flex-shrink: 0; /* Prevent shrinking */
  height: 100px;
  background-color: rgba(128, 128, 128, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
}

.counter-bar:hover {
  background-color: rgba(128, 128, 128, 0.8);
}

.counter-bar.active {
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
    align-items: center; /* Center items when stacked */
  }

  .content-section {
    align-items: center; /* Center title area */
    height: auto; /* Reset height */
  }

  .title-area {
    text-align: center;
  }

  .counter-area {
    margin-top: 2rem; /* Adjust margin for smaller screens */
    padding-bottom: 0; /* Reset padding */
    width: 100%; /* Ensure counter area takes full width on mobile */
  }

  .counter-bar {
    width: 40px;
    height: 60px;
  }
}

@media (max-width: 600px) {
  .home-layout {
    padding: 1rem;
  }

  .counter-bar {
    width: 30px;
    height: 40px;
  }
}
</style>
