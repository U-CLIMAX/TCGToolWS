<template>
  <v-container fluid class="home-view fill-height">
    <v-row class="fill-height" align="center" justify="center">
      <!-- Left Section -->
      <v-col cols="12" md="5" class="d-flex flex-column justify-space-between" style="height: 70vh;">
        <!-- Title Area (Left Top) -->
        <div class="title-area">
          <h1 class="main-title">U CLIMAX</h1>
          <p class="sub-title">ws中文卡查</p>
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
            >
              <span v-if="currentIndex === index" class="counter-number">{{ index + 1 }}</span>
            </div>
          </div>
        </div>
      </v-col>

      <!-- Right Section - Image Display with Coordinate Lines -->
      <v-col cols="12" md="7" class="d-flex align-center justify-start" style="height: 70vh;">
        <!-- Coordinate System -->
        <div class="coordinate-system">
          <!-- Vertical Line (extends up to match image height, small portion below) -->
          <div class="vertical-line"></div>
          <!-- Horizontal Line (extends right to match image width, small portion left) -->
          <div class="horizontal-line"></div>
          <!-- Triangle in 4th quadrant near origin -->
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
      </v-col>
    </v-row>
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
}

/* Title Area */
.title-area {
  align-self: flex-start;
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
  align-self: flex-start;
}

.counter-container {
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
}

.counter-bar {
  height: 50px;
  width: 50px;
  background-color: rgba(128, 128, 128, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.counter-bar:hover {
  background-color: rgba(128, 128, 128, 0.8);
}

.counter-bar.active {
  width: 200px;
  background-color: rgba(255, 255, 255, 0.9);
}

.counter-number {
  font-size: 1.5rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-background));
}

/* Coordinate System */
.coordinate-system {
  position: relative;
  width: 100%;
  max-width: 800px;
  aspect-ratio: 16 / 9;
}

/* Vertical Line - extends from top edge down past the bottom edge */
.vertical-line {
  position: absolute;
  left: 0;
  bottom: -20px; /* Extends 20px below the origin */
  width: 2px;
  height: calc(100% + 20px); /* Starts from the top and goes down */
  background-color: rgb(var(--v-theme-on-background));
  opacity: 0.6;
}

/* Horizontal Line - extends from right edge left past the left edge */
.horizontal-line {
  position: absolute;
  bottom: 0;
  left: -20px; /* Extends 20px left of the origin */
  width: calc(100% + 20px); /* Starts from the right and goes left */
  height: 2px;
  background-color: rgb(var(--v-theme-on-background));
  opacity: 0.6;
}

/* Triangle in 4th quadrant near origin */
.triangle {
  position: absolute;
  width: 24px;
  height: 24px;
  background-color: rgb(var(--v-theme-on-background));
  clip-path: polygon(0 0, 100% 0, 0 100%); /* Right angle at top-left */
  opacity: 0.6;
  /* Position it with a gap */
  left: 10px; /* Gap from vertical line */
  bottom: -34px; /* -24px height - 10px gap */
}

/* Image Display - positioned in 1st quadrant */
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

/* Fade transition for image switching */
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
  .main-title {
    font-size: clamp(2rem, 4vw, 3rem);
  }

  .sub-title {
    font-size: clamp(0.9rem, 1.5vw, 1.2rem);
  }

  .counter-bar {
    height: 40px;
    width: 40px;
  }

  .counter-bar.active {
    width: 160px;
  }
}

@media (max-width: 600px) {
  .counter-area {
    margin-top: 2rem;
  }

  .counter-bar {
    height: 30px;
    width: 30px;
  }

  .counter-bar.active {
    width: 120px;
  }

  .counter-number {
    font-size: 1.2rem;
  }

  .coordinate-system {
    width: 100%;
  }
}
</style>