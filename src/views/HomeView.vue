<template>
  <v-container fluid class="home-view fill-height d-flex align-center">
    <v-row align="start" justify="center" style="width: 100%">
      <!-- Left Section -->
      <v-col cols="12" md="4" class="d-flex flex-column">
        <!-- Title Area (Left Top) -->
        <div class="title-area">
          <h1 class="main-title">U CLIMAX</h1>
          <p class="sub-title">ws卡查工具</p>
        </div>

        <!-- Image Counter (Left Bottom) -->

      </v-col>

      <!-- Right Section - Image Display with Coordinate Lines -->
      <v-col cols="12" md="7" class="d-flex align-start justify-start">
        <!-- Coordinate System -->
        <div class="coordinate-system">
          <div class="counter-area">
            <div class="counter-container">
              <div
                v-for="(image, index) in images"
                :key="index"
                class="counter-bar"
                :class="{ active: currentIndex === index }"
                @click="goToImage(index)"
              >
              </div>
            </div>
          </div>
          <!-- Vertical Line (extends up to match image height, small portion below) -->
          <div class="vertical-line"></div>
          <!-- Horizontal Line (extends right to match image width, small portion left) -->
          <div class="horizontal-line"></div>
          <!-- Triangle in 3th quadrant near origin -->
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
  height: 60vh;
  aspect-ratio: 16 / 9;
}

/* Vertical Line - extends from top edge down past the bottom edge */
.vertical-line {
  position: absolute;
  left: 0;
  bottom: -25px; /* Extends 20px below the origin */
  width: 1px;
  height: calc(100% + 25px); /* Starts from the top and goes down */
  background-color: rgb(var(--v-theme-on-background));
}

/* Horizontal Line - extends from right edge left past the left edge */
.horizontal-line {
  position: absolute;
  bottom: 0;
  left: -25px; /* Extends 20px left of the origin */
  width: calc(100% + 25px); /* Starts from the right and goes left */
  height: 1px;
  background-color: rgb(var(--v-theme-on-background));
}

/* Triangle in 3rd quadrant near origin */
.triangle {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: rgb(var(--v-theme-on-background));
  clip-path: polygon(100% 0, 0 0, 100% 100%); /* Right angle at bottom-right */
  /* Position it with a 1px gap */
  bottom: -12px; /* -10px height - 2px gap */
  right: calc(100% + 2px); /* 1px gap from vertical line */
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