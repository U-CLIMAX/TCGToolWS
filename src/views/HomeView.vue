<template>
  <v-container
    fluid
    class="home-view fill-height themed-scrollbar"
    :class="{ 'overflow-hidden': splashStatus !== 'finished' }"
  >
    <SplashAnimation
      v-if="splashStatus !== 'finished'"
      :status="splashStatus"
      @start-exit="handleSplashExit"
      @animation-finished="handleSplashFinished"
    />
    <div class="main-content-wrapper" :class="{ 'splash-active': splashStatus !== 'finished' }">
      <div ref="homeLayout" class="home-layout animated-section">
        <!-- Left Section -->
        <div class="content-section">
          <div class="title-area">
            <h1
              class="main-title"
              :class="{ 'ciallo-animation': isCialloActive }"
              @click="handleTitleClick"
            >
              {{ mainTitleText }}
            </h1>
            <p
              class="sub-title"
              :class="{ 'ciallo-animation': isCialloActive }"
              :style="{
                fontFamily: isCialloActive ? 'Chill Round Gothic' : 'var(--font-family-subtitle)',
              }"
            >
              {{ subTitleText }}
            </p>
          </div>

          <!-- Desktop Counter -->
          <div class="counter-area d-none d-lg-block">
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
                :src="images[currentIndex].src"
                :lazy-src="images[currentIndex].lqip"
                class="display-image clickable-image preload-img"
                cover
                @click="openImageDialog"
              ></v-img>
            </transition>

            <!-- Mobile Counter -->
            <div class="counter-area d-block d-xl-none">
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
      <div ref="featuresSection" class="features-section animated-section">
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
              <div
                class="feature-glass-bg"
                :class="{ 'has-blur': isHardwareAccelerated === true }"
              ></div>
              <div class="feature-img-wrapper">
                <v-img
                  :src="feature.image.src"
                  :lazy-src="feature.image.lqip"
                  class="feature-img preload-img"
                  cover
                ></v-img>
              </div>
            </div>
            <p class="feature-text">{{ feature.text }}</p>
          </div>
        </div>
      </div>

      <!-- PC and Phone Support Section -->
      <div ref="pcPhoneSection" class="pc-phone-section animated-section">
        <div class="pc-phone-content">
          <v-img
            :src="pcPhoneImg.src"
            :lazy-src="pcPhoneImg.lqip"
            class="pc-phone-img preload-img"
            cover
          ></v-img>
          <p class="pc-phone-text">支持网页端与手机端</p>
        </div>
      </div>

      <!-- Promo Section -->
      <div ref="promoSection" class="promo-section animated-section">
        <div class="promo-content">
          <div class="video-wrapper">
            <iframe
              src="//player.bilibili.com/player.html?isOutside=true&aid=115552085345391&bvid=BV1zaCCBaEds&cid=34016988267&p=1&autoplay=0"
              scrolling="no"
              border="0"
              frameborder="no"
              framespacing="0"
              allowfullscreen="true"
            ></iframe>
          </div>
          <div style="min-height: 2em">
            <p class="promo-text">使用教程视频</p>
          </div>
        </div>
      </div>

      <!-- Support Section -->
      <div ref="supportSection" class="support-section animated-section">
        <!-- Left Block -->
        <div
          class="glass-block support-left-block"
          :class="{ 'has-blur': isHardwareAccelerated === true }"
        >
          <v-row class="pa-4 fill-height" align="center">
            <v-col cols="12" md="7" class="d-flex flex-column align-center justify-center">
              <div class="d-flex align-center mb-4">
                <v-icon color="light-blue-lighten-3" size="small" class="mr-2">
                  mdi-star-circle
                </v-icon>
                <span class="text-h6 font-weight-bold text-white">赞助会员特权</span>
              </div>
              <v-list bg-color="transparent" class="flex-grow-1">
                <v-list-item class="px-0 mb-3">
                  <template v-slot:prepend>
                    <v-icon color="green-accent-2" size="20">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title class="text-body-1 text-white font-weight-medium">
                    无限卡组数量
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-grey-lighten-5">
                    创建任意数量的卡组，不受限制
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item class="px-0 mb-3">
                  <template v-slot:prepend>
                    <v-icon color="green-accent-2" size="20">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title class="text-body-1 text-white font-weight-medium">
                    卡组历史记录
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-grey-lighten-5">
                    随时查看历史版本
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item class="px-0 mb-3">
                  <template v-slot:prepend>
                    <v-icon color="green-accent-2" size="20">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title class="text-body-1 text-white font-weight-medium">
                    解除编辑卡组限制
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-grey-lighten-5">
                    编辑卡组时可超过50张卡片限制
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item class="px-0 mb-3">
                  <template v-slot:prepend>
                    <v-icon color="green-accent-2" size="20">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title class="text-body-1 text-white font-weight-medium">
                    更多功能开发中...
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-col>
            <v-col
              cols="12"
              md="5"
              class="d-flex flex-column align-center justify-center text-center pa-6"
            >
              <v-icon color="light-blue-lighten-3" size="48" class="mb-3">mdi-heart-circle</v-icon>
              <div class="text-h5 font-weight-bold text-white mb-2">成为赞助者</div>
              <div class="d-flex align-baseline mb-4">
                <span class="text-h3 font-weight-bold text-green-lighten-1">¥5</span>
                <span class="text-body-1 text-white ml-1">/月</span>
              </div>
              <v-btn
                color="orange-darken-1"
                size="large"
                variant="elevated"
                @click="handleSupportClick"
                prepend-icon="mdi-heart"
                class="mb-4"
                min-width="160"
              >
                立即赞助
              </v-btn>
              <v-divider class="my-3" width="60%" opacity="30"></v-divider>
              <div class="d-flex align-center justify-center">
                <v-icon size="16" class="mr-1" color="warning">mdi-lightning-bolt</v-icon>
                <span class="text-caption text-white">由爱发电平台提供支付服务</span>
              </div>
            </v-col>
          </v-row>
        </div>
        <!-- Right Block -->
        <div
          class="glass-block support-right-block"
          :class="{ 'has-blur': isHardwareAccelerated === true }"
        >
          <h3>问题反馈邮箱</h3>
          <div class="feedback-email">
            <a href="mailto:issues@uclimax.cn">issues@uclimax.cn</a>
          </div>
        </div>
      </div>

      <!-- Copyright Section -->
      <div ref="copyrightSection" class="copyright-section animated-section">
        <p>版权声明</p>
        <br />
        <p>
          敬请尊重并遵守官方版权相关规定。您在使用我方资料时，须同时严格遵循日本官方转载协议，例如不得将资料非法用于商业用途。
        </p>
        <br />
        <p>
          如您的行为存在侵犯官方版权的情况，U CLIMAX网站及相关人员对此不承担任何责任，亦无任何关联。
        </p>
        <br />
        <p>U CLIMAX及相关人员对本声明内容拥有最终解释权。</p>
        <br />

        <p>附加说明</p>
        <br />

        <p>
          1. 若您计划大面积使用我方资料，须事先与U
          CLIMAX相关负责人取得联系，并获得书面同意后方可实施。
        </p>
        <br />
        <p>
          2. 对于會明确攻击、诋毁U
          CLIMAX或其相关人员的组织/个人，以及其他不受UCLIMAX欢迎的组织/个人，我方有权拒绝其使用任何资料。
        </p>
        <br />
        <p>
          3. 一旦发现违规使用资料的行为，U
          CLIMAX有权要求立即撤回相关内容；根据情节严重程度，我方将采取列入黑名单、追究法律责任等进一步措施。
        </p>
        <br />
        <p>我们致力于积极维护国内ws社区的健康环境，感谢您的理解与支持！</p>
      </div>

      <v-sheet color="transparent" class="pa-4 mt-8">
        <v-divider class="mb-4" color="white"></v-divider>

        <v-col cols="12" class="text-caption text-grey-darken-1 text-center">
          <div>
            U CLIMAX 是一个非官方粉丝工具，所有卡牌资料版权归 Bushiroad (武士道) 所有，本网站与
            Bushiroad 并无任何官方合作或授权关系。
          </div>
          <div class="mt-1">
            © {{ new Date().getFullYear() }} U CLIMAX. All rights reserved. |
            <a href="mailto:issues@uclimax.cn" class="text-grey-darken-1 text-decoration-underline">
              问题反馈
            </a>
          </div>
        </v-col>

        <v-col
          cols="12"
          class="d-flex justify-center align-center ga-3 mt-4 text-grey-darken-1 text-body-2"
        >
          <a href="https://github.com/U-CLIMAX/TCGToolWS" target="_blank">
            <v-img
              src="/github.svg"
              width="20"
              height="20"
              alt="GitHub Icon"
              class="flex-grow-0"
              style="filter: invert(1) brightness(0.5)"
            ></v-img>
          </a>
          <div>
            Developed by
            <a
              href="https://github.com/FuseFairy"
              target="_blank"
              class="text-grey-darken-1 text-decoration-underline"
            >
              Zhuang
            </a>
            &
            <a
              href="https://github.com/Yuuzi261"
              target="_blank"
              class="text-grey-darken-1 text-decoration-underline"
            >
              Yuuzi
            </a>
          </div>

          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-palette" :size="20"></v-icon>
            <div>
              <a class="text-grey-darken-1"> Kamomim </a>
            </div>
          </div>
        </v-col>
      </v-sheet>
    </div>

    <ImageZoomViewer
      v-model="dialogImage"
      :images="images"
      :initial-index="currentIndex"
      @dialog-opened="stopAutoScroll"
      @dialog-closed="startAutoScroll"
    />

    <!-- Auth Alert Dialog -->
    <v-dialog v-model="isAuthAlertOpen" max-width="400px">
      <v-card>
        <v-card-title> 需要登入</v-card-title>
        <v-card-text> 赞助功能需要登入后才能使用。 </v-card-text>
        <v-card-actions>
          <v-btn color="primary" text @click="isAuthAlertOpen = false">确定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <SponsorNoticeDialog v-model="isSponsorNoticeOpen" @confirm="proceedToPayment" />
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useIntersectionObserver } from '@/composables/useIntersectionObserver'
import SplashAnimation from '@/components/common/SplashAnimation.vue'
import ImageZoomViewer from '@/components/ui/ImageZoomViewer.vue'
import SponsorNoticeDialog from '@/components/ui/SponsorNoticeDialog.vue'
import { useHardwareAcceleration } from '@/composables/useHardwareAcceleration'

// 使用 ?lqip 後綴，插件返回 Object：{ lqip, src, width, height }
import seriesCardImg from '@/assets/intro/series_card_list.webp?lqip'
import featuresImg from '@/assets/intro/features_intro.webp?lqip'
import singleCardImg from '@/assets/intro/single_card.webp?lqip'
import deckFeaturesImg from '@/assets/intro/deck_features.webp?lqip'
import featurePdfImg from '@/assets/feature/export-pdf.webp?lqip'
import featureDeckImg from '@/assets/feature/deck-edit.webp?lqip'
import featureSearchImg from '@/assets/feature/global-search.webp?lqip'
import pcPhoneImg from '@/assets/pc_and_ph.webp?lqip'

const { isHardwareAccelerated } = useHardwareAcceleration()
const authStore = useAuthStore()

const uiStore = useUIStore()
const isAuthAlertOpen = ref(false)
const isSponsorNoticeOpen = ref(false)

const proceedToPayment = async () => {
  uiStore.setLoading(true)
  try {
    // 這裡才是真正呼叫付款的函數
    await authStore.initiatePayment()
  } catch (err) {
    console.error(err)
  } finally {
    uiStore.setLoading(false)
  }
}

const handleSupportClick = async () => {
  if (!authStore.isAuthenticated) {
    isAuthAlertOpen.value = true
    return
  }

  // 不直接付款，而是打開「須知 Modal」
  isSponsorNoticeOpen.value = true
}

// --- Splash Animation State ---
const splashStatus = ref('active') // 'active', 'animating-out', 'finished'

const handleSplashExit = () => {
  splashStatus.value = 'animating-out'
}

const handleSplashFinished = () => {
  splashStatus.value = 'finished'
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('splashShown', 'true')
  }
  startAutoScroll()
}

const images = ref([seriesCardImg, featuresImg, singleCardImg, deckFeaturesImg])
const features = ref([
  {
    id: 1,
    image: featurePdfImg,
    text: '支持导出卡组pdf',
  },
  {
    id: 2,
    image: featureDeckImg,
    text: '卡组编辑可视化',
  },
  {
    id: 3,
    image: featureSearchImg,
    text: '支持全局搜索',
  },
])

const dialogImage = ref(false)

const openImageDialog = () => {
  dialogImage.value = true
}

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

// --- Animation on Scroll ---
const featuresSection = ref(null)
const pcPhoneSection = ref(null)
const promoSection = ref(null)
const copyrightSection = ref(null)
const supportSection = ref(null)

const setupObserver = (target) => {
  const { start, stop } = useIntersectionObserver(
    target,
    (element) => {
      element.classList.add('is-visible')
      stop() // Stop observing once visible
    },
    { threshold: 0.1 }
  )
  start()
}

// --- Ciallo～(∠・ω< )⌒☆ ---
const mainTitleText = ref('U CLIMAX')
const subTitleText = ref('ws卡查工具')
const titleClickCount = ref(0)
let titleClickTimer = null
const isCialloActive = ref(false)

const handleTitleClick = () => {
  titleClickCount.value++

  if (titleClickTimer) {
    clearTimeout(titleClickTimer)
  }

  if (titleClickCount.value >= 10) {
    mainTitleText.value = 'U Ciallo～'
    subTitleText.value = '(∠・ω< )⌒☆'
    isCialloActive.value = true
    titleClickCount.value = 0 // Reset count immediately after trigger

    // Revert back after a while
    setTimeout(() => {
      mainTitleText.value = 'U CLIMAX'
      subTitleText.value = 'ws卡查工具'
      isCialloActive.value = false
    }, 2000) // Keep the new text for 2 seconds
  } else {
    // Reset counter if clicks are too slow
    titleClickTimer = setTimeout(() => {
      titleClickCount.value = 0
    }, 1500) // Reset after 1.5 seconds of inactivity
  }
}

onMounted(() => {
  // One-time splash animation logic
  if (typeof window !== 'undefined' && sessionStorage.getItem('splashShown')) {
    splashStatus.value = 'finished'
    startAutoScroll()
  }

  // Layout and scroll logic
  updateScrollPadding()
  window.addEventListener('resize', updateScrollPadding)

  // Animation logic
  setupObserver(homeLayout)
  setupObserver(featuresSection)
  setupObserver(pcPhoneSection)
  setupObserver(promoSection)
  setupObserver(copyrightSection)
  setupObserver(supportSection)
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
  --font-size-title: clamp(2.7rem, 6vw, 5rem);
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
  transition:
    transform 0.6s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.4s ease-out;
}

.main-content-wrapper.splash-active {
  transform: translateY(100px);
  opacity: 0;
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
  -webkit-text-stroke: 0.06vw rgb(var(--color-white-rgb));
  color: rgba(var(--color-white-rgb), 0.8); /* Set the text color (Fill) to 0.8 transparency. */
  user-select: none;
  cursor: auto;
  transform-origin: left center;
}

.sub-title {
  font-size: var(--font-size-subtitle);
  font-weight: 100;
  line-height: 0.9;
  margin: 0;
  color: rgb(var(--color-white-rgb));
  -webkit-text-stroke: 0.1vw rgba(var(--color-white-rgb), 0.15);
  user-select: none;
  transform-origin: left center;
}

.features-title {
  font-family: var(--font-family-subtitle);
  font-size: var(--font-size-feature-title);
  font-weight: 700;
  color: rgb(var(--color-white-rgb));
  -webkit-text-stroke: 0.1vw rgba(var(--color-white-rgb), 0.15);
  max-width: var(--max-layout-width);
  margin: 0 auto 1.5rem auto;
  padding: 0 2rem;
}

.feature-text {
  font-size: var(--font-size-feature-text);
  font-weight: bold;
  color: rgba(var(--color-white-rgb), 0.9);
}

.pc-phone-text,
.promo-text {
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
  /* Fallback background for when blur is off */
  background: rgba(var(--color-white-rgb), 0.4); /* Slightly more opaque */
  border-radius: var(--border-radius-feature-glass);
  border: 1px solid rgba(var(--color-white-rgb), 0.1);
  transition:
    backdrop-filter 0.3s ease,
    background 0.3s ease;
  z-index: 1;
}

.feature-glass-bg.has-blur {
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  /* Original background for when blur is on */
  background: rgba(var(--color-white-rgb), 0.2);
}

.feature-img-wrapper {
  position: absolute;
  bottom: 5.4%;
  left: 50%;
  transform: translateX(-50%) translateZ(0);
  width: 75.7%; /* (100 - 5.4 * 2.25 *2)% */
  aspect-ratio: 1 / 1;
  pointer-events: none;
  z-index: 10;
}

.feature-img {
  width: 100%;
  height: 100%;
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

/* --- Promo Section --- */
.promo-section {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 12rem;
}

.promo-content {
  width: clamp(26.5rem, 50vw, 61.25rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.video-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 Aspect Ratio */
  border-radius: var(--border-radius-card);
  overflow: hidden;
  background-color: #000;
}

.video-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
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
  /* Fallback background for when blur is off */
  background: rgba(var(--color-white-rgb), 0.2); /* Slightly more opaque */
  border-radius: var(--border-radius-glass-block);
  border: 1px solid rgba(var(--color-white-rgb), 0.1);
  padding: 2rem;
  transition:
    backdrop-filter 0.3s ease,
    background 0.3s ease;
}

.glass-block.has-blur {
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  /* Original background for when blur is on */
  background: rgba(var(--color-white-rgb), 0.1);
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

.feedback-email a {
  font-size: clamp(1.44rem, 2.4vw, 2rem);
  font-weight: bold;
  color: inherit;
  text-decoration: underline;
}

/* --- Animation on Scroll --- */
.animated-section {
  opacity: 0;
  transform: translateY(80px);
  transition: transform 0.6s ease-out;
}

.animated-section.is-visible {
  opacity: 1;
  transform: translateY(0);
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

.ciallo-animation {
  animation: ciallo-reveal 0.5s ease-in-out;
}

@keyframes ciallo-reveal {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* --- Responsive Adjustments --- */
@media (max-width: 1280px) {
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

  .pc-phone-section,
  .promo-section {
    margin-top: 8rem;
  }

  .pc-phone-content,
  .promo-content {
    width: clamp(26.5rem, 90vw, 61.25rem);
  }

  .copyright-section {
    width: 75%;
    margin-top: 8rem;
  }

  .support-section {
    grid-template-columns: 1fr;
    margin-top: 8rem;
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

  .feature-item {
    flex: 0 0 clamp(244px, 75vw, 311px);
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

  .pc-phone-section,
  .promo-section {
    margin-top: 6rem;
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
}
</style>
