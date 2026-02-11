<template>
  <v-app id="app" class="grid-background" :style="appStyle">
    <HomeBackground v-show="isHomeRoute" />
    <v-app-bar
      v-if="!smAndDown"
      scroll-behavior="elevate"
      scroll-threshold="160"
      height="50"
      :color="isHomeRoute ? '#212121' : 'default'"
      :elevation="isHomeRoute ? 0 : 5"
    >
      <v-app-bar-title>
        <v-img
          :src="titleImg"
          alt="UClimax for ws"
          class="ma-16"
          :class="{ 'ml-0': smAndDown }"
          contain
          eager
          :style="titleImgStyle"
          @click="goToHome"
        ></v-img>
      </v-app-bar-title>

      <template #append>
        <template v-if="!isInSpecialFlow">
          <div class="d-none d-md-block h-100">
            <template v-for="item in navItems" :key="item.to">
              <!-- Search Dropdown -->
              <v-menu v-if="item.name === 'GlobalSearch'" offset="5" open-on-hover>
                <template v-slot:activator="{ props }">
                  <v-btn
                    variant="text"
                    :active="$route.name === 'GlobalSearch'"
                    :base-color="$route.params.game === 'wsr' ? 'ws-rose' : undefined"
                    class="h-100 rounded-0"
                    v-bind="props"
                  >
                    <template #prepend>
                      <v-icon :icon="navIcons[item.icon]" size="24"></v-icon>
                    </template>
                    {{ item.text }}
                  </v-btn>
                </template>
                <v-list density="compact" :class="{ 'glass-menu': hasBackgroundImage }">
                  <v-list-item
                    :to="{ name: 'GlobalSearch', params: { game: 'ws' } }"
                    title="Weiβ Schwarz"
                  >
                  </v-list-item>
                  <v-list-item
                    color="ws-rose"
                    :to="{ name: 'GlobalSearch', params: { game: 'wsr' } }"
                    title="Weiβ Schwarz Rose"
                  >
                  </v-list-item>
                </v-list>
              </v-menu>

              <!-- Decks Dropdown -->
              <v-menu v-else-if="item.name === 'Decks'" offset="5" open-on-hover>
                <template v-slot:activator="{ props }">
                  <v-btn
                    variant="text"
                    :active="item.group && $route.meta.group === item.group"
                    class="h-100 rounded-0"
                    v-bind="props"
                  >
                    <template #prepend>
                      <v-icon :icon="navIcons[item.icon]" size="24"></v-icon>
                    </template>
                    {{ item.text }}
                  </v-btn>
                </template>
                <v-list
                  density="compact"
                  :class="{ 'glass-menu': hasBackgroundImage }"
                  class="rounded-2lg"
                >
                  <v-list-item
                    v-if="authStore.isAuthenticated"
                    :to="{ name: 'Decks' }"
                    title="我的卡组"
                    prepend-icon="mdi-cards-variant"
                  >
                  </v-list-item>
                  <v-list-item
                    :to="{ name: 'DecksGallery' }"
                    title="卡组广场"
                    prepend-icon="mdi-view-grid-outline"
                  >
                  </v-list-item>
                </v-list>
              </v-menu>

              <!-- Standard Buttons -->
              <v-btn
                v-else-if="!item.requiresAuth || authStore.isAuthenticated"
                variant="text"
                :to="{ name: item.name }"
                :text="item.text"
                class="h-100 rounded-0"
                :active="item.group && $route.meta.group === item.group"
                :prepend-icon="navIcons[item.icon]"
              >
                <template #prepend>
                  <v-icon :icon="navIcons[item.icon]" size="24"></v-icon>
                </template>
              </v-btn>
            </template>
          </div>
          <v-divider
            class="mx-3 align-self-center d-none d-md-block"
            length="24"
            thickness="2"
            vertical
          ></v-divider>
        </template>

        <template v-if="!authStore.isAuthReady">
          <div class="d-flex align-center justify-center mx-2" style="width: 40px; height: 40px">
            <v-progress-circular
              indeterminate
              size="24"
              width="2"
              color="grey"
            ></v-progress-circular>
          </div>
        </template>
        <template v-else>
          <v-badge
            v-if="authStore.isAuthenticated"
            :model-value="userRole === 0"
            color="red"
            dot
            location="top end"
            offset-x="12"
            offset-y="11"
          >
            <v-btn
              @click="isUserProfileModalOpen = true"
              icon="mdi-account-circle"
              :class="accountIconClass"
            ></v-btn>
          </v-badge>

          <template v-if="!isInSpecialFlow">
            <v-btn
              v-if="!authStore.isAuthenticated"
              @click="handleLogin"
              icon="mdi-account-circle"
              color="blue-grey-lighten-2"
            ></v-btn>
          </template>
        </template>
      </template>
    </v-app-bar>

    <v-main :scrollable="true">
      <router-view v-slot="{ Component }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

    <v-bottom-navigation
      v-if="smAndDown"
      :bg-color="isHomeRoute ? '#212121' : 'default'"
      :height="50"
      class="pb-4"
      grow
      app
    >
      <template v-for="item in navItems" :key="item.to">
        <!-- Search Menu -->
        <v-menu v-if="item.name === 'GlobalSearch'" location="top center" offset="10">
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              :value="item.name"
              :active="$route.name === 'GlobalSearch'"
              :base-color="$route.params.game === 'wsr' ? 'ws-rose' : undefined"
              style="min-width: 0"
            >
              <v-icon :icon="navIcons[item.icon]"></v-icon>
            </v-btn>
          </template>
          <v-list
            density="compact"
            :class="{ 'glass-menu': hasBackgroundImage }"
            class="rounded-2lg"
          >
            <v-list-item
              :to="{ name: 'GlobalSearch', params: { game: 'ws' } }"
              title="Weiβ Schwarz"
            >
            </v-list-item>
            <v-list-item
              color="ws-rose"
              :to="{ name: 'GlobalSearch', params: { game: 'wsr' } }"
              title="Weiβ Schwarz Rose"
            >
            </v-list-item>
          </v-list>
        </v-menu>

        <!-- Decks Menu -->
        <v-menu v-else-if="item.name === 'Decks'" location="top center" offset="10">
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              :value="item.name"
              :active="item.group && $route.meta.group === item.group"
              style="min-width: 0"
            >
              <v-icon :icon="navIcons[item.icon]"></v-icon>
            </v-btn>
          </template>
          <v-list
            density="compact"
            :class="{ 'glass-menu': hasBackgroundImage }"
            class="rounded-2lg"
          >
            <v-list-item
              v-if="authStore.isAuthenticated"
              :to="{ name: 'Decks' }"
              title="我的卡组"
              prepend-icon="mdi-cards-variant"
            >
            </v-list-item>
            <v-list-item
              :to="{ name: 'DecksGallery' }"
              title="卡组广场"
              prepend-icon="mdi-view-grid-outline"
            >
            </v-list-item>
          </v-list>
        </v-menu>

        <!-- Standard Button -->
        <v-btn
          v-else-if="!item.requiresAuth || authStore.isAuthenticated"
          :to="{ name: item.name }"
          :value="item.name"
          :active="item.group && $route.meta.group === item.group"
          color="primary"
          style="min-width: 0"
        >
          <v-icon :icon="navIcons[item.icon]"></v-icon>
        </v-btn>
      </template>

      <template v-if="!authStore.isAuthReady">
        <v-btn disabled value="loading" style="min-width: 0">
          <v-progress-circular indeterminate size="24" width="2" color="grey"></v-progress-circular>
        </v-btn>
      </template>
      <template v-else>
        <v-btn
          v-if="!authStore.isAuthenticated"
          @click="handleLogin"
          value="login"
          style="min-width: 0"
          :active="false"
        >
          <v-icon icon="mdi-account-circle" color="blue-grey-lighten-2"></v-icon>
        </v-btn>

        <v-btn
          v-else
          @click="isUserProfileModalOpen = true"
          value="profile"
          style="min-width: 0"
          :class="accountIconClass"
          :active="false"
        >
          <v-badge :model-value="userRole === 0" color="red" dot location="top start" offset-x="13">
            <v-icon icon="mdi-account-circle" color="grey-lighten-1"></v-icon>
          </v-badge>
        </v-btn>
      </template>
    </v-bottom-navigation>

    <v-snackbar v-model="show" :color="color" timeout="2000" location="top" opacity="0.8" eager>
      {{ text }}
    </v-snackbar>

    <AuthDialog ref="authDialog" />
    <SettingsModal v-model="isSettingsModalOpen" />
    <UserProfileModal v-model="isUserProfileModalOpen" @logout="handleLogoutClick" />
    <SponsorNoticeDialog v-model="isSponsorNoticeOpen" @confirm="proceedToPayment" />

    <v-dialog v-model="isLogoutDialogVisible" max-width="320" persistent>
      <v-card class="rounded-2lg pa-2">
        <v-card-title>确定登出</v-card-title>
        <v-card-text class="text-body-2 text-medium-emphasis">
          您确定要登出目前的帐号吗？
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text="取消" @click="isLogoutDialogVisible = false"></v-btn>
          <v-btn color="primary" variant="tonal" text="确定" @click="confirmLogout"></v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <AppUpdateDialog />

    <!-- Global Loading Overlay -->
    <v-overlay v-model="uiStore.isLoading" class="d-flex align-center justify-center" persistent>
      <half-circle-spinner :animation-duration="1000" :size="64" :color="spinnerColor" />
    </v-overlay>
  </v-app>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useTheme, useDisplay } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/composables/useSnackbar'
import { usePerformanceManager } from '@/composables/usePerformanceManager'
import AuthDialog from '@/components/ui/AuthDialog.vue'
import SettingsModal from '@/components/ui/SettingsModal.vue'
import UserProfileModal from '@/components/ui/UserProfileModal.vue'
import AppUpdateDialog from '@/components/ui/AppUpdateDialog.vue'
import HomeBackground from '@/components/common/HomeBackground.vue'
import SponsorNoticeDialog from '@/components/ui/SponsorNoticeDialog.vue'
import { HalfCircleSpinner } from 'epic-spinners'

import titleDarkImg from '@/assets/ui/title-dark.webp'
import titleLightImg from '@/assets/ui/title-light.webp'
import titleMonochrome from '@/assets/ui/title-monochrome.webp'
import HomeIcon from '@/assets/ui/home.svg'
import SeriesCardTableIcon from '@/assets/ui/series-card-table.svg'
import DeckIcon from '@/assets/ui/deck.svg'
import SearchIcon from '@/assets/ui/search.svg'
import MarketIcon from '@/assets/ui/market.svg'

usePerformanceManager()

const authStore = useAuthStore()
const { userRole } = storeToRefs(authStore)
const vuetifyTheme = useTheme()
const uiStore = useUIStore()
const { mdAndDown, smAndDown } = useDisplay()

const titleImgStyle = computed(() => {
  return {
    maxWidth: mdAndDown.value ? '140px' : '170px',
  }
})

const accountIconClass = computed(() => {
  const role = userRole.value
  const isDark = vuetifyTheme.global.current.value.dark || isHomeRoute.value

  if (role === 1) {
    return isDark ? 'premium-user-icon-dark' : 'premium-user-icon-light'
  }
  if (role === 2) {
    return isDark ? 'developer-user-icon-dark' : 'developer-user-icon-light'
  }
  return null
})
const authDialog = ref(null)
const { show, text, color, triggerSnackbar } = useSnackbar()
const route = useRoute()
const isSettingsModalOpen = ref(false)
const isUserProfileModalOpen = ref(false)
const isHomeRoute = computed(() => route.name === 'Home')
const titleImg = computed(() => {
  const isLightTheme = vuetifyTheme.global.name.value === 'light'
  return isHomeRoute.value ? titleMonochrome : isLightTheme ? titleLightImg : titleDarkImg
})
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)
const spinnerColor = computed(() => {
  return vuetifyTheme.current.value.colors.primary
})

const isInSpecialFlow = computed(() => {
  return !!route.meta.isSpecialFlow
})

const isSponsorNoticeOpen = ref(false)

const handleLogin = () => {
  authDialog.value?.open()
}

const proceedToPayment = async () => {
  uiStore.setLoading(true)
  try {
    await authStore.initiatePayment()
  } catch (err) {
    console.error(err)
  } finally {
    uiStore.setLoading(false)
  }
}

const isLogoutDialogVisible = ref(false)
const handleLogoutClick = () => {
  isLogoutDialogVisible.value = true
}

const confirmLogout = () => {
  authStore.logout()
  triggerSnackbar('您已成功登出。')
  isLogoutDialogVisible.value = false
  isUserProfileModalOpen.value = false
}

const navIcons = {
  'home.svg': HomeIcon,
  'market.svg': MarketIcon,
  'series-card-table.svg': SeriesCardTableIcon,
  'deck.svg': DeckIcon,
  'search.svg': SearchIcon,
}

const navItems = [
  { text: '首页', name: 'Home', requiresAuth: false, icon: 'home.svg' },
  { text: '集换大厅', name: 'Market', requiresAuth: false, icon: 'market.svg' },
  {
    text: '卡片搜索',
    name: 'GlobalSearch',
    requiresAuth: false,
    icon: 'search.svg',
  },
  {
    text: '系列卡表',
    name: 'SeriesCardTable',
    requiresAuth: false,
    icon: 'series-card-table.svg',
    group: 'series',
  },
  { text: '卡组', name: 'Decks', requiresAuth: false, icon: 'deck.svg', group: 'decks' },
]

const appStyle = computed(() => {
  // If on the home route, hide the custom background to show the HomeBackground component
  if (isHomeRoute.value) {
    return {
      '--bg-image': 'none',
    }
  }

  const bg = uiStore.backgroundImage
  if (bg && bg.src) {
    return {
      '--bg-image': `url(${bg.src})`,
      '--bg-size': bg.size || 'cover',
      '--bg-blur': `${bg.blur || 0}px`,
      '--bg-mask-color': `rgba(0, 0, 0, ${bg.maskOpacity ?? 0})`,
    }
  }
  return {
    '--bg-image': 'none',
  }
})

const router = useRouter()
const goToHome = () => {
  router.push({ name: 'Home' })
}

const transitionName = ref('slide-y-in')
watch(
  () => route.name,
  (toName) => {
    if (toName === 'Home') {
      transitionName.value = 'slide-y-out-only'
    } else {
      transitionName.value = 'slide-y-in'
    }
  },
  { immediate: true }
)

watch(
  () => uiStore.theme,
  (newTheme) => {
    vuetifyTheme.change(newTheme)
  },
  { immediate: true }
)
</script>

<style>
#app {
  position: relative;
  isolation: isolate;
}

#app::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  background-image: linear-gradient(var(--bg-mask-color), var(--bg-mask-color)), var(--bg-image);
  background-size: var(--bg-size);
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  filter: blur(var(--bg-blur));
  transition: filter 0.3s ease;
}

/* Image fade-in animation on route enter */
.slide-y-in-enter-active .series-card .v-img {
  transition:
    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.1s,
    opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1) 0.1s !important;
}
.slide-y-in-enter-from .series-card .v-img {
  transform: scale(0.95);
  opacity: 0;
}

.slide-y-in-enter-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-y-in-enter-from {
  transform: translateY(-20px);
  /* opacity: 0; */
}

.slide-y-in-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}

.slide-y-in-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* Transition for navigating to Home: only animates the leaving component */
.slide-y-out-only-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}

.slide-y-out-only-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* Premium User (Role 1) - Light Theme */
.premium-user-icon-light .v-icon {
  background: var(--golden-gradirnt-light);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-loop 3s linear infinite;
}

/* Premium User (Role 1) - Dark Theme */
.premium-user-icon-dark .v-icon {
  background: var(--golden-gradirnt-dark);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-loop 3s linear infinite;
}

/* Developer User (Role 2) - Light Theme */
.developer-user-icon-light .v-icon {
  background: var(--rainbow-gradirnt-light);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-loop 3s linear infinite;
}

/* Developer User (Role 2) - Dark Theme */
.developer-user-icon-dark .v-icon {
  background: var(--rainbow-gradirnt-dark);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-loop 3s linear infinite;
}

/* 設定給效果小圖標用的樣式 */
.inline-icon {
  height: 1rem;
  vertical-align: -0.15rem;
}
</style>
