<template>
  <v-container fluid class="home-view fill-height">
    <div class="home-background">
      <div class="solid-background-layer"></div>
      <div id="lottie-animation" class="lottie-animation-layer"></div>
      <div class="glass-layer"></div>
      <div class="texture-layer"></div>
    </div>
    <div class="main-content-wrapper">
      <div ref="homeLayout" class="home-layout">
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
      <!-- Features Section -->
      <div class="features-section">
        <h2 class="features-title">工具特色</h2>
        <div
          ref="scrollContainer"
          class="features-scroll-container"
          @mousedown="handleMouseDown"
          @mouseleave="handleMouseLeave"
          @mouseup="handleMouseUp"
          @mousemove="handleMouseMove"
        >
          <div v-for="feature in features" :key="feature.id" class="feature-item">
            <div class="feature-card">
              <div class="feature-glass-bg"></div>
              <v-img :src="feature.image" class="feature-img" cover></v-img>
            </div>
            <p class="feature-text">{{ feature.text }}</p>
          </div>
        </div>
      </div>

      <!-- PC and Phone Support Section -->
      <div class="pc-phone-section">
        <div class="pc-phone-content">
          <v-img src="/pc_and_ph.webp" class="pc-phone-img" cover></v-img>
          <p class="pc-phone-text">支持网页端与手机端</p>
        </div>
      </div>

      <!-- Copyright Section -->
      <div class="copyright-section">
        <p>版权声明</p><br></br>
        <p>敬请尊重并遵守官方版权相关规定。您在使用我方资料时，须同时严格遵循日本官方转载协议，例如不得将资料非法用于商业用途。</p><br></br>
        <p>如您的行为存在侵犯官方版权的情况，U CLIMAX网站及相关人员对此不承担任何责任，亦无任何关联。</p><br></br>
        <p>U CLIMAX及相关人员对本声明内容拥有最终解释权。</p><br></br>

        <p>附加说明</p><br></br>

        <p>1. 若您计划大面积使用我方资料，须事先与U CLIMAX相关负责人取得联系，并获得书面同意后方可实施。</p><br></br>
        <p>2. 对于會明确攻击、诋毁U CLIMAX或其相关人员的组织/个人，以及其他不受UCLIMAX欢迎的组织/个人，我方有权拒绝其使用任何资料。</p><br></br>
        <p>3. 一旦发现违规使用资料的行为，U CLIMAX有权要求立即撤回相关内容；根据情节严重程度，我方将采取列入黑名单、追究法律责任等进一步措施。</p><br></br>
        <p>我们致力于积极维护国内ws社区的健康环境，感谢您的理解与支持！</p>
      </div>

      <!-- Support Section -->
      <div class="support-section">
        <!-- Left Block -->
        <div class="glass-block support-left-block">
          <div class="support-left-block-content">
            <div class="support-main-content">
              <div class="support-us">
                <h3>支持我们</h3>
                <div class="placeholder"></div>
              </div>
              <div class="support-community">
                <h3>相关社群</h3>
                <div class="placeholder"></div>
              </div>
            </div>
            <div class="ifd-section">
              <h2>爱发电</h2>
            </div>
          </div>
        </div>
        <!-- Right Block -->
        <div class="glass-block support-right-block">
          <h3>问题反馈</h3>
          <div class="feedback-email">
            <p>uclimax@xxx.com</p>
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

const features = ref([
  { id: 1, image: '/feature/export-pdf.webp', text: '支持导出卡组pdf' },
  { id: 2, image: '/feature/deck-edit.webp', text: '卡组编辑可视化' },
  { id: 3, image: '/feature/global-search.webp', text: '支持全局搜索' },
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

// --- Drag to Scroll and Layout Logic ---
const homeLayout = ref(null)
const scrollContainer = ref(null)
const isDown = ref(false)
const startX = ref(0)
const scrollLeft = ref(0)

const handleMouseDown = (e) => {
  if (!scrollContainer.value) return
  isDown.value = true
  scrollContainer.value.classList.add('active')
  startX.value = e.clientX - scrollContainer.value.getBoundingClientRect().left
  scrollLeft.value = scrollContainer.value.scrollLeft
}

const handleMouseLeave = () => {
  if (!scrollContainer.value) return
  isDown.value = false
  scrollContainer.value.classList.remove('active')
}

const handleMouseUp = () => {
  if (!scrollContainer.value) return
  isDown.value = false
  scrollContainer.value.classList.remove('active')
}

const handleMouseMove = (e) => {
  if (!isDown.value || !scrollContainer.value) return
  e.preventDefault()
  const x = e.clientX - scrollContainer.value.getBoundingClientRect().left
  const walk = (x - startX.value) * 2 // scroll-fast
  scrollContainer.value.scrollLeft = scrollLeft.value - walk
}

const updateScrollPadding = () => {
  if (homeLayout.value && scrollContainer.value) {
    const layoutRect = homeLayout.value.getBoundingClientRect()
    const layoutPadding = parseInt(getComputedStyle(homeLayout.value).paddingLeft, 10)
    // The scroll container is full-bleed, so its content needs to be padded
    // by the same amount as the home-layout's content is from the viewport edge.
    const totalPadding = layoutRect.left + layoutPadding
    scrollContainer.value.style.paddingLeft = `${totalPadding}px`
    scrollContainer.value.style.paddingRight = `${totalPadding}px`
  }
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

  // Layout and scroll logic
  updateScrollPadding()
  window.addEventListener('resize', updateScrollPadding)
})

onUnmounted(() => {
  stopAutoScroll()
  window.removeEventListener('resize', updateScrollPadding)
})
</script>

<style scoped>
/* --- Root Variables --- */
.home-view {
  /* Layout & Sizing */
  --axis-gap: clamp(1rem, 2vw, 1.5rem);
  --axis-cross-length: clamp(1.3rem, 2.5vw, 2rem);
  --max-layout-width: 1400px;

  /* Typography */
  --font-family-title: 'DINCond-Black';
  --font-family-subtitle: 'DINPro-Light';
  --font-size-title: clamp(2rem, 6vw, 5rem);
  --font-size-subtitle: clamp(1.4rem, 2.8vw, 2.1rem);
  --font-size-feature-title: clamp(1.2rem, 2.2vw, 1.7rem);
  --font-size-feature-text: clamp(0.9rem, 1.5vw, 1rem);
  --font-size-pc-phone-text: clamp(1rem, 2vw, 1.5rem);

  /* Colors & Effects */
  --color-white-rgb: 255, 255, 255;
  --color-grey-rgb: 128, 128, 128;
  --color-dark-black-rgb: 18, 18, 18;
  --color-bg-solid: #232323;
  --shadow-image: 0 8px 32px rgba(0, 0, 0, 0.3);

  /* Borders */
  --border-radius-image: 4px;
  --border-radius-card: 8px;
  --border-radius-feature-glass: clamp(36px, 4vw, 52px);
  --border-radius-glass-block: clamp(36px, 4vw, 52px);

  /* Transitions */
  --transition-duration: 0.3s;

  /* Mobile Specific */
  --mobile-counter-gap: clamp(2rem, 6vw, 3rem);
  --mobile-counter-height-tablet: 60px;
  --mobile-counter-height-phone: 40px;
}

/* --- Base & Background --- */
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
  background-color: var(--color-bg-solid);
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
  background: rgba(var(--color-dark-black-rgb), 0.2);
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

/* --- Main Layout --- */
.home-view {
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  align-items: flex-start; /* Align to top */
  justify-content: center;
  position: relative; /* Ensure content is above background */
  z-index: 0; /* Ensure content is above background */
  background: none; /* Remove default background */
  padding-top: 5vh; /* Add some padding to the top */
  padding-bottom: 5vh; /* Add some padding to the bottom */
}

.main-content-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
}

.home-layout {
  width: 100%;
  max-width: var(--max-layout-width); /* Max width for large screens */
  padding: 2rem;
  display: grid;
  grid-template-columns: 1fr 1.5fr; /* Left column takes 1 part, right takes 1.5 */
  align-items: start; /* Align items to the top */
  gap: var(--axis-gap);
  margin: 0 auto; /* Center the layout when max-width is applied */
  position: relative;
}

/* --- Sections --- */
.content-section {
  display: flex;
  flex-direction: column;
  height: 100%; /* Ensure section takes full height of grid row */
}

.visual-section {
  display: flex;
  justify-content: center;
}

.features-section {
  width: 100%;
  margin-top: 6rem;
}

.pc-phone-section {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 12rem;
}

/* --- Typography --- */
.title-area {
  text-align: left;
}

.main-title {
  font-family: var(--font-family-title);
  font-size: var(--font-size-title);
  line-height: 0.9;
  margin: 0 0 3px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-text-stroke: 1px rgb(var(--color-white-rgb));
  color: rgba(var(--color-white-rgb), 0.8); /* Set the text color (Fill) to 0.8 transparency. */
}

.sub-title {
  font-family: var(--font-family-subtitle);
  font-size: var(--font-size-subtitle);
  font-weight: 100;
  line-height: 0.9;
  margin: 0;
  color: rgb(var(--color-white-rgb));
  -webkit-text-stroke: 1px rgba(var(--color-white-rgb), 0.1);
}

.features-title {
  font-family: var(--font-family-subtitle);
  font-size: var(--font-size-feature-title);
  font-weight: 700;
  color: rgb(var(--color-white-rgb));
  -webkit-text-stroke: 1px rgba(var(--color-white-rgb), 0.1);
  max-width: var(--max-layout-width);
  margin: 0 auto 1.5rem auto;
  padding: 0 2rem;
}

.feature-text {
  font-size: var(--font-size-feature-text);
  font-weight: bold;
  color: rgba(var(--color-white-rgb), 0.9);
}

.pc-phone-text {
  font-size: var(--font-size-pc-phone-text);
  font-weight: bold;
  color: rgba(var(--color-white-rgb), 0.9);
  text-align: center;
}

/* --- Component: Image Carousel & Counter --- */
.display-image {
  position: absolute;
  top: 0;
  left: var(--axis-gap);
  bottom: var(--axis-gap);
  right: 0;
  width: auto;
  height: auto;
  border-radius: var(--border-radius-image);
  box-shadow: var(--shadow-image);
}

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
  background-color: rgba(var(--color-grey-rgb), 0.5);
  cursor: pointer;
  transition: all var(--transition-duration) ease;
}

.content-section .counter-bar:hover {
  background-color: rgba(var(--color-grey-rgb), 0.8);
}

.content-section .counter-bar.active {
  flex-grow: 1; /* Allow active bar to grow and fill space */
  width: auto; /* Width is now flexible */
  background-color: rgba(var(--color-white-rgb), 0.9);
}

/* --- Component: Coordinate System --- */
.coordinate-system {
  position: relative;
  height: 35.6rem;
  aspect-ratio: 16 / 9;
  width: 100%;
  max-width: 100%;
}

.vertical-line,
.horizontal-line,
.triangle {
  background-color: rgb(var(--color-white-rgb));
}

.vertical-line {
  position: absolute;
  left: 0;
  bottom: calc(-1 * var(--axis-cross-length));
  width: 1px;
  height: calc(100% + var(--axis-cross-length));
  transition: height var(--transition-duration) ease;
}

.horizontal-line {
  position: absolute;
  bottom: 0;
  left: calc(-1 * var(--axis-cross-length));
  width: calc(100% + var(--axis-cross-length));
  height: 1px;
}

.triangle {
  position: absolute;
  width: calc(var(--axis-cross-length) * 0.3);
  height: calc(var(--axis-cross-length) * 0.3);
  clip-path: polygon(100% 0, 0 0, 100% 100%);
  bottom: calc(var(--axis-cross-length) * -0.3 - 2px);
  right: calc(100% + 2px);
}

/* --- Component: Features Section --- */
.features-scroll-container {
  display: flex;
  overflow-x: auto;
  gap: 2rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
  cursor: grab;
  user-select: none;
  /* Hide scrollbar */
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */

  /* Full-bleed effect */
  position: relative;
  width: 100vw;
  left: 50%;
  transform: translateX(-50%);
}

.features-scroll-container::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.features-scroll-container.active {
  cursor: grabbing;
}

.feature-item {
  flex: 0 0 clamp(440px, 35vw, 560px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.feature-card {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 80%; /* Creates space for the overflowing image */
}

.feature-glass-bg {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  aspect-ratio: 49 / 32;
  background: rgba(var(--color-white-rgb), 0.2);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  border-radius: var(--border-radius-feature-glass);
  border: 1px solid rgba(var(--color-white-rgb), 0.1);
}

.feature-img {
  position: absolute;
  bottom: 5.4%;
  left: 50%;
  transform: translateX(-50%);
  width: 75.7%; /* (100 - 5.4 * 2.25 *2)% */
  aspect-ratio: 1 / 1;
  pointer-events: none;
}

/* --- Component: PC and Phone Support Section --- */
.pc-phone-content {
  width: clamp(26.5rem, 50vw, 61.25rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.pc-phone-img {
  width: 100%;
  height: auto;
  border-radius: var(--border-radius-card);
}

/* --- Copyright Section --- */
.copyright-section {
  width: clamp(30rem, 60vw, 70rem);
  margin: 12rem auto 0 auto;
  color: rgba(var(--color-white-rgb), 0.8);
  text-align: left;
}

.copyright-section p {
  font-size: var(--font-size-feature-text);
  font-weight: bold;
  line-height: 1.7;
  color: rgba(var(--color-white-rgb), 0.7);
}

/* --- Support Section --- */
.support-section {
  width: 100%;
  max-width: var(--max-layout-width);
  margin: 12rem auto 4rem auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: 1fr 0.73fr;
  gap: 3.5rem;
  color: rgba(var(--color-white-rgb), 0.9);
}

.glass-block {
  background: rgba(var(--color-white-rgb), 0.1);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  border-radius: var(--border-radius-glass-block);
  border: 1px solid rgba(var(--color-white-rgb), 0.1);
  padding: 2rem;
}

.support-left-block-content {
  display: grid;
  grid-template-columns: 5fr 3fr;
  gap: 1.5rem;
  height: 100%;
}

.support-main-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.support-us,
.support-community {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.placeholder {
  height: 60px; /* Placeholder height */
  background: rgba(var(--color-white-rgb), 0.1);
  border-radius: var(--border-radius-card);
}

.ifd-section {
  text-align: center;
}

.ifd-section h2 {
  font-size: clamp(3.24rem, 5.4vw, 4.5rem);
  font-family: var(--font-family-subtitle);
  font-weight: 700;
  line-height: 1.35;
}

.support-right-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.support-right-block h3 {
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  font-family: var(--font-family-subtitle);
  font-weight: 500;
  margin-bottom: 3rem;
}

.feedback-email p {
  font-size: clamp(1.44rem, 2.4vw, 2rem);
  font-weight: bold;
}

/* --- Transitions --- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-duration) ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* --- Responsive Adjustments --- */
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
  }

  .coordinate-system .counter-bar {
    width: var(--w-tablet);
    height: var(--mobile-counter-height-tablet);
    background-color: rgba(var(--color-grey-rgb), 0.5);
    cursor: pointer;
    transition: all var(--transition-duration) ease;
  }

  .coordinate-system .counter-bar.active {
    width: var(--w-active-tablet);
    background-color: rgba(var(--color-white-rgb), 0.9);
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

  .pc-phone-content {
    width: clamp(26.5rem, 90vw, 61.25rem);;
  }

  .copyright-section {
    width: 75%;
    margin-top: 8rem;
  }

  .support-section {
    grid-template-columns: 1fr;
    margin-top: 4rem;
  }
}

@media (max-width: 599.98px) {
  .home-layout {
    padding: 1rem;
    padding-bottom: calc(
      var(--mobile-counter-gap) + var(--mobile-counter-height-phone) + 1rem
    ); /* Keep space for counter */
  }

  .features-section {
    margin-top: 4rem;
  }

  .features-title {
    padding: 0 1rem;
  }

  .features-scroll-container {
    padding-right: 1rem;
  }

  .coordinate-system {
    --w-phone: calc(var(--mobile-counter-height-phone) / 2.5);
    --w-active-phone: calc(var(--w-phone) * 4);
  }

  /* Adjust mobile counter for smaller screens */
  .coordinate-system .counter-container {
    gap: calc(var(--mobile-counter-height-phone) * 0.15);
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

  .copyright-section {
    margin-top: 6rem;
    padding: 0 1rem;
    width: 100%;
  }

  .support-section {
    padding: 0 1rem;
  }

  .support-left-block-content {
    grid-template-columns: 1fr;
  }

  .ifd-section {
    text-align: left;
    margin-top: 1.5rem;
  }
}
</style>
