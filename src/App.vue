<template>
  <v-app id="app" class="grid-background" :style="appStyle">
    <HomeBackground v-show="isHomeRoute" />

    <v-app-bar
      v-if="smAndUp"
      class="floating-bar main-bar rounded-pill pr-3"
      :class="{ 'glass-header': !isHomeRoute && hasBackgroundImage }"
      scroll-behavior="elevate"
      scroll-threshold="160"
      height="50"
      :elevation="isHomeRoute ? 0 : 3"
      :color="isHomeRoute ? 'transparent' : undefined"
    >
      <v-app-bar-title>
        <v-img
          :src="titleImg"
          alt="UClimax for ws"
          :class="mdAndUp ? 'ml-16' : 'ml-1'"
          contain
          eager
          :style="titleImgStyle"
          @click="goToHome"
        ></v-img>
      </v-app-bar-title>

      <template #append>
        <template v-if="!isInSpecialFlow">
          <div class="d-none d-sm-block">
            <template v-for="item in navItems" :key="item.name">
              <v-btn
                variant="text"
                :to="{ name: item.name }"
                :text="item.text"
                class="rounded-3md mr-1"
                :class="{ 'home-route-btn': isHomeRoute }"
                :active="item.group && $route.meta.group === item.group"
                :active-color="isHomeRoute ? 'cyan-accent-2' : undefined"
                :color="isHomeRoute ? 'white' : undefined"
                :disabled="item.requiresAuth && !authStore.isAuthenticated"
              >
                <template #prepend>
                  <v-icon :icon="navIcons[item.icon]" size="24" />
                </template>
              </v-btn>
            </template>

            <!-- Toolbox Dropdown -->
            <v-menu
              :close-on-content-click="false"
              location="bottom center"
              offset="10"
              open-on-hover
            >
              <template v-slot:activator="{ props }">
                <v-btn
                  variant="text"
                  class="rounded-3md mr-1"
                  v-bind="props"
                  :active="$route.meta.group === 'toolbox'"
                  :active-color="isHomeRoute ? 'cyan-accent-2' : undefined"
                  :color="isHomeRoute ? 'white' : undefined"
                >
                  <template #prepend>
                    <v-icon :icon="navIcons['toolbox.svg']" size="24" />
                  </template>
                  工具箱
                </v-btn>
              </template>
              <v-list
                v-model:opened="desktopOpenedGroups"
                density="compact"
                :class="{ 'glass-menu': hasBackgroundImage }"
                class="rounded-3md"
                nav
                indent="20"
              >
                <!-- Nested Search Menu -->
                <v-list-group
                  value="search"
                  expand-icon="i-mdi:menu-right"
                  collapse-icon="i-mdi:menu-down"
                >
                  <template v-slot:activator="{ props }">
                    <v-list-item
                      v-bind="props"
                      title="卡片搜索"
                      :prepend-icon="navIcons['search.svg']"
                      :active="$route.name === 'GlobalSearch'"
                      :color="routeGameColor"
                      slim
                      class="rounded-3md"
                    >
                    </v-list-item>
                  </template>
                  <v-list-item
                    v-for="gameOpt in GAME_TYPE_OPTIONS"
                    :key="gameOpt.value"
                    :to="{ name: 'GlobalSearch', params: { game: gameOpt.value } }"
                    :title="`Weiβ Schwarz ${gameOpt.title === 'WS' ? '' : gameOpt.title === 'WSR' ? 'Rose' : '简中'}`"
                    :color="gameOpt.color"
                    slim
                    class="rounded-3md"
                  >
                  </v-list-item>
                </v-list-group>
                <template
                  v-for="subItem in toolboxItems.filter((i) => i.name !== 'GlobalSearch')"
                  :key="subItem.name"
                >
                  <v-list-item
                    :to="{ name: subItem.name }"
                    :title="subItem.text"
                    :prepend-icon="navIcons[subItem.icon]"
                    slim
                    class="rounded-3md"
                    :disabled="subItem.requiresAuth && !authStore.isAuthenticated"
                  >
                  </v-list-item>
                </template>
              </v-list>
            </v-menu>
          </div>
          <v-divider
            class="mx-3 align-self-center d-none d-md-block"
            length="24"
            thickness="2"
            vertical
            :color="isHomeRoute ? 'transparent' : undefined"
          ></v-divider>
          <v-btn icon @click="NoticeDialogRef?.open()" style="min-width: 0" size="x-small">
            <v-badge :model-value="noticeStore.hasNew" color="error" dot offset-x="2" offset-y="2">
              <v-icon :color="isHomeRoute ? 'white' : undefined" icon="i-mdi:bell" size="24" />
            </v-badge>
          </v-btn>
        </template>
      </template>
    </v-app-bar>

    <v-app-bar
      v-if="smAndUp"
      class="floating-bar sub-bar rounded-pill"
      :class="{ 'glass-header': !isHomeRoute && hasBackgroundImage }"
      scroll-behavior="elevate"
      scroll-threshold="160"
      height="50"
      :elevation="isHomeRoute ? 0 : 3"
      :color="isHomeRoute ? 'transparent' : undefined"
    >
      <div class="d-flex align-center justify-center w-100 h-100">
        <template v-if="!authStore.isAuthReady">
          <v-progress-circular indeterminate size="24" width="2" color="grey"></v-progress-circular>
        </template>
        <template v-else>
          <v-btn
            v-if="authStore.isAuthenticated"
            @click="isUserProfileModalOpen = true"
            :ripple="false"
            :class="accountIconClass"
            size="x-small"
            icon
          >
            <v-icon icon="i-mdi:account-circle" size="24" />
          </v-btn>

          <template v-if="!isInSpecialFlow">
            <v-btn
              v-if="!authStore.isAuthenticated"
              @click="handleLogin"
              :ripple="false"
              color="green-lighten-2"
              size="x-small"
              icon
            >
              <v-icon icon="i-mdi:account-circle" size="24" />
            </v-btn>
          </template>
        </template>
      </div>
    </v-app-bar>

    <!-- Progressive Header Blur -->
    <v-fade-transition>
      <div
        v-if="!isHomeRoute"
        class="header-progressive-blur"
        :style="{
          '--header-height': smAndUp ? 'calc(var(--v-layout-top) + 40px)' : '0',
        }"
      ></div>
      <div v-else-if="smAndUp" class="home-header-progressive-blur"></div>
    </v-fade-transition>

    <v-main
      :scrollable="true"
      :class="{ 'pa-0': !smAndUp || noPaddingsRoute }"
      :style="
        smAndUp
          ? 'padding-top: calc(var(--v-layout-top) / 2);'
          : 'padding-bottom: calc(var(--v-layout-bottom) / 2);'
      "
    >
      <router-view v-slot="{ Component }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

    <v-bottom-navigation
      v-if="!smAndUp"
      class="floating-bottom-bar main-bottom-bar rounded-pill pa-2"
      :class="{ 'glass-header': !isHomeRoute && hasBackgroundImage }"
      :height="50"
      app
      mandatory
      :elevation="isHomeRoute ? 0 : 3"
      :color="isHomeRoute ? 'transparent' : undefined"
      :bg-color="isHomeRoute ? 'rgb(33, 33, 33)' : undefined"
    >
      <template v-for="item in navItems" :key="item.name">
        <v-btn
          :to="{ name: item.name }"
          :value="item.name"
          :active="item.group && $route.meta.group === item.group"
          style="min-width: 0"
          :active-color="isHomeRoute ? 'cyan-accent-2' : undefined"
          :color="isHomeRoute ? 'white' : undefined"
          class="rounded-pill"
          :disabled="item.requiresAuth && !authStore.isAuthenticated"
        >
          <v-icon :icon="navIcons[item.icon]" size="32" />
        </v-btn>
      </template>
    </v-bottom-navigation>

    <v-bottom-navigation
      v-if="!smAndUp"
      class="floating-bottom-bar sub-bottom-bar rounded-circle"
      :class="{ 'glass-header': !isHomeRoute && hasBackgroundImage }"
      :height="50"
      app
      :elevation="isHomeRoute ? 0 : 3"
      :color="isHomeRoute ? 'transparent' : undefined"
      :bg-color="isHomeRoute ? 'rgb(33, 33, 33)' : undefined"
    >
      <!-- Toolbox Menu Activator instead of Profile btn -->
      <v-menu :close-on-content-click="false" location="top right" offset="10">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            style="min-width: 0"
            :active="$route.meta.group === 'toolbox'"
            :active-color="isHomeRoute ? 'cyan-accent-2' : undefined"
            :color="isHomeRoute ? 'white' : undefined"
          >
            <v-icon :icon="navIcons['toolbox.svg']" size="32" />
          </v-btn>
        </template>
        <v-list
          v-model:opened="mobileOpenedGroups"
          density="compact"
          :class="{ 'glass-menu': hasBackgroundImage }"
          class="rounded-3md"
          nav
          indent="20"
        >
          <!-- Notice at top right -->
          <div class="d-flex justify-end">
            <v-btn
              icon
              @click="NoticeDialogRef?.open()"
              style="min-width: 0"
              variant="text"
              size="x-small"
            >
              <v-badge
                :model-value="noticeStore.hasNew"
                color="error"
                dot
                offset-x="2"
                offset-y="2"
              >
                <v-icon icon="i-mdi:bell" size="22" />
              </v-badge>
            </v-btn>
          </div>

          <!-- Search Menu -->
          <v-list-group
            value="search"
            expand-icon="i-mdi:menu-right"
            collapse-icon="i-mdi:menu-down"
          >
            <template v-slot:activator="{ props }">
              <v-list-item
                v-bind="props"
                title="卡片搜索"
                :prepend-icon="navIcons['search.svg']"
                :active="$route.name === 'GlobalSearch'"
                :color="routeGameColor"
                slim
                class="rounded-3md"
              >
              </v-list-item>
            </template>
            <v-list-item
              v-for="gameOpt in GAME_TYPE_OPTIONS"
              :key="gameOpt.value"
              :to="{ name: 'GlobalSearch', params: { game: gameOpt.value } }"
              :title="`Weiβ Schwarz ${gameOpt.title === 'WS' ? '' : gameOpt.title === 'WSR' ? 'Rose' : '简中'}`"
              :color="gameOpt.color"
              slim
              class="rounded-3md"
            >
            </v-list-item>
          </v-list-group>
          <template
            v-for="subItem in toolboxItems.filter((i) => i.name !== 'GlobalSearch')"
            :key="subItem.name"
          >
            <v-list-item
              :to="{ name: subItem.name }"
              :title="subItem.text"
              :prepend-icon="navIcons[subItem.icon]"
              slim
              class="rounded-3md"
              :disabled="subItem.requiresAuth && !authStore.isAuthenticated"
            >
            </v-list-item>
          </template>

          <v-divider class="mt-2 mx-auto" style="width: 65%" />

          <!-- Avatar buttons at bottom right -->
          <div class="d-flex justify-end align-center">
            <template v-if="!authStore.isAuthReady">
              <v-progress-circular
                indeterminate
                size="24"
                width="2"
                color="grey"
                class="ma-2"
              ></v-progress-circular>
            </template>
            <template v-else>
              <v-btn
                v-if="!authStore.isAuthenticated"
                @click="handleLogin"
                color="green-lighten-2"
                variant="text"
                size="x-small"
                icon
              >
                <v-icon icon="i-mdi:account-circle" size="22" />
              </v-btn>
              <v-btn
                v-else
                @click="isUserProfileModalOpen = true"
                :class="accountIconClass"
                variant="text"
                size="x-small"
                icon
              >
                <v-icon icon="i-mdi:account-circle" size="22" />
              </v-btn>
            </template>
          </div>
        </v-list>
      </v-menu>
    </v-bottom-navigation>

    <v-snackbar
      v-model="show"
      :color="color"
      timeout="2000"
      location="top"
      :style="{ opacity: 0.85 }"
      rounded="pill"
      eager
    >
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
    <NoticeDialog ref="NoticeDialogRef" />

    <!-- Global Loading Overlay -->
    <v-overlay v-model="uiStore.isLoading" class="d-flex align-center justify-center" persistent>
      <half-circle-spinner :animation-duration="1000" :size="64" :color="spinnerColor" />
    </v-overlay>
  </v-app>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeMount } from 'vue'
import { useTheme, useDisplay } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useNoticeStore } from '@/stores/notice'
import { useSnackbar } from '@/composables/useSnackbar'
import { usePerformanceManager } from '@/composables/usePerformanceManager'
import { HalfCircleSpinner } from 'epic-spinners'
import { GAME_TYPE_OPTIONS } from '@/maps/series-map'
import { runIPGeolocation } from '@/utils/ipGeolocation'

import titleDefaultImg from '@/assets/ui/title-default.webp'
import titleMonochrome from '@/assets/ui/title-monochrome.webp'
import HomeIcon from '@/assets/ui/home.svg'
import SeriesCardTableIcon from '@/assets/ui/series-card-table.svg'
import DeckIcon from '@/assets/ui/deck.svg'
import SearchIcon from '@/assets/ui/search.svg'
import MarketIcon from '@/assets/ui/market.svg'
import ToolboxIcon from '@/assets/ui/toolbox.svg'
import DeckGalleryIcon from '@/assets/ui/deck-gallery.svg'
import CommunityIcon from '@/assets/ui/community.svg'

usePerformanceManager()

const authStore = useAuthStore()
const noticeStore = useNoticeStore()
const { userRole } = storeToRefs(authStore)
const vuetifyTheme = useTheme()
const uiStore = useUIStore()
const { smAndUp, mdAndUp } = useDisplay()

onBeforeMount(async () => {
  await runIPGeolocation()
})
onMounted(async () => {
  if (authStore.isAuthenticated) {
    try {
      await authStore.refreshSession()
    } catch (e) {
      // refreshSession internal error handling already triggers logout
      console.warn('Initial session refresh skipped or failed:', e.message)
    }
  }
})

const titleImgStyle = computed(() => {
  const isDark = vuetifyTheme.global.current.value.dark
  return {
    maxWidth: '110px',
    filter: !isHomeRoute.value && isDark ? 'invert(1)' : undefined,
  }
})

const accountIconClass = computed(() => {
  const role = userRole.value
  const isDark = vuetifyTheme.global.current.value.dark

  if (role === 1) {
    return isDark ? 'premium-user-icon-dark' : 'premium-user-icon-light'
  }
  if (role === 2) {
    return isDark ? 'developer-user-icon-dark' : 'developer-user-icon-light'
  }
  return 'text-blue-grey-lighten-2'
})
const authDialog = ref(null)
const NoticeDialogRef = ref(null)
const { show, text, color, triggerSnackbar } = useSnackbar()
const route = useRoute()
const isSettingsModalOpen = ref(false)
const isUserProfileModalOpen = ref(false)
const isHomeRoute = computed(() => route.name === 'Home')
const noPaddingsRoute = computed(() => route.name === 'DecksGallery' || route.name === 'Community')

const routeGameColor = computed(() => {
  const game = route.params.game
  if (!game) return undefined
  return GAME_TYPE_OPTIONS.find((opt) => opt.value === game)?.color
})

const titleImg = computed(() => {
  return isHomeRoute.value ? titleMonochrome : titleDefaultImg
})
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)
const spinnerColor = computed(() => {
  return vuetifyTheme.current.value.colors.primary
})

const isInSpecialFlow = computed(() => {
  return !!route.meta.isSpecialFlow
})

const isSponsorNoticeOpen = ref(false)
const desktopOpenedGroups = ref([])
const mobileOpenedGroups = ref([])

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
  'toolbox.svg': ToolboxIcon,
  'deck-gallery.svg': DeckGalleryIcon,
  'community.svg': CommunityIcon,
}

const navItems = [
  { text: '首页', name: 'Home', requiresAuth: false, icon: 'home.svg' },
  {
    text: '系列卡表',
    name: 'SeriesCardTable',
    requiresAuth: false,
    icon: 'series-card-table.svg',
    group: 'series',
  },
  { text: '我的卡组', name: 'Decks', requiresAuth: true, icon: 'deck.svg', group: 'decks' },
]

const toolboxItems = [
  {
    text: '集换大厅',
    name: 'Market',
    icon: 'market.svg',
    requiresAuth: false,
    group: 'toolbox',
  },
  {
    text: '卡组广场',
    name: 'DecksGallery',
    icon: 'deck-gallery.svg',
    requiresAuth: false,
    group: 'toolbox',
  },
  {
    text: '玩家社群',
    name: 'Community',
    icon: 'community.svg',
    requiresAuth: false,
    group: 'toolbox',
  },
  {
    text: '卡片搜索',
    name: 'GlobalSearch',
    icon: 'search.svg',
    group: 'toolbox',
  },
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
  --v-layout-top: 50px !important;
  --v-layout-bottom: 50px !important;
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

/* 設定給效果小圖標用的樣式 */
.inline-icon {
  height: 1rem;
  vertical-align: -0.15rem;
}
</style>

<style scope>
/* Floating App Bar Styles */
.floating-bar {
  margin: 12px 16px !important;
  border-radius: 12px !important;
  width: calc(100% - 32px) !important;
  left: 0 !important;
  right: 0 !important;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.floating-bar.main-bar {
  width: calc(100% - 32px - 60px - 20px) !important;
  right: auto !important;
}

.floating-bar.sub-bar {
  width: 60px !important;
  left: auto !important;
  top: 0px !important;
}

.floating-bottom-bar.main-bottom-bar {
  width: fit-content !important;
  max-width: calc(100% - 32px - 50px - 20px) !important;
  right: auto !important;
}

.floating-bottom-bar.sub-bottom-bar {
  width: 50px !important;
  height: 50px !important;
  left: auto !important;
}

.floating-bottom-bar {
  margin: 0 12% 20px 12% !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.home-route-btn .v-btn__overlay {
  background: transparent !important;
}

/* Premium User (Role 1) - Light Theme */
.premium-user-icon-light .v-icon {
  background: var(--golden-gradirnt-light);
  background-size: 200% 100%;
  animation: gradient-loop 3s linear infinite;
}

/* Premium User (Role 1) - Dark Theme */
.premium-user-icon-dark .v-icon {
  background: var(--golden-gradirnt-dark);
  background-size: 200% 100%;
  animation: gradient-loop 3s linear infinite;
}

/* Developer User (Role 2) - Light Theme */
.developer-user-icon-light .v-icon {
  background: var(--rainbow-gradirnt-light);
  background-size: 200% 100%;
  animation: gradient-loop 3s linear infinite;
}

/* Developer User (Role 2) - Dark Theme */
.developer-user-icon-dark .v-icon {
  background: var(--rainbow-gradirnt-dark);
  background-size: 200% 100%;
  animation: gradient-loop 3s linear infinite;
}
</style>
