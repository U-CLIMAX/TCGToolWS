<template>
  <v-app id="app" class="grid-background" :style="appStyle">
    <HomeBackground v-show="isHomeRoute" />
    <v-app-bar
      scroll-behavior="elevate"
      scroll-threshold="160"
      height="50"
      :color="isHomeRoute ? '#212121' : 'default'"
      :elevation="isHomeRoute ? 0 : 5"
    >
      <template #prepend>
        <v-app-bar-nav-icon class="d-md-none" @click="drawer = !drawer"></v-app-bar-nav-icon>
      </template>

      <v-app-bar-title>
        <v-img
          :src="titleImg"
          alt="UClimax for ws"
          class="ma-16"
          :class="{ 'ma-auto': smAndDown }"
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
              <v-menu v-if="item.name === 'GlobalSearch'" open-on-hover>
                <template v-slot:activator="{ props }">
                  <v-btn variant="text" class="h-100 rounded-0" v-bind="props">
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

              <!-- Standard Buttons -->
              <v-btn
                v-else-if="!item.requiresAuth || authStore.isAuthenticated"
                variant="text"
                :to="{ name: item.name }"
                :text="item.text"
                class="h-100 rounded-0"
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

        <v-btn @click="isSettingsModalOpen = true" icon="mdi-cog"></v-btn>

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
            v-bind="props"
            @click="isUserProfileModalOpen = true"
            icon="mdi-account-circle"
            :class="accountIconClass"
          ></v-btn>
        </v-badge>

        <template v-if="!isInSpecialFlow">
          <v-btn
            v-if="!authStore.isAuthenticated"
            @click="handleLogin"
            text="LOGIN"
            color="teal-lighten-1"
            class="pa-1"
          ></v-btn>
        </template>
      </template>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" temporary touchless>
      <v-list class="py-0">
        <template v-for="item in navItems" :key="item.to">
          <!-- Search Group -->
          <v-list-group v-if="item.name === 'GlobalSearch'" value="search">
            <template v-slot:activator="{ props }">
              <v-list-item v-bind="props" :title="item.text">
                <template #prepend>
                  <v-icon :icon="navIcons[item.icon]" size="24"></v-icon>
                </template>
              </v-list-item>
            </template>
            <v-list-item
              :to="{ name: 'GlobalSearch', params: { game: 'ws' } }"
              title="Weiβ Schwarz"
            ></v-list-item>
            <v-list-item
              color="ws-rose"
              :to="{ name: 'GlobalSearch', params: { game: 'wsr' } }"
              title="Weiβ Schwarz Rose"
            ></v-list-item>
          </v-list-group>

          <!-- Standard Items -->
          <v-list-item
            v-else-if="!item.requiresAuth || authStore.isAuthenticated"
            :to="{ name: item.name }"
            :title="item.text"
          >
            <template #prepend>
              <v-icon :icon="navIcons[item.icon]" size="24"></v-icon>
            </template>
          </v-list-item>
        </template>
      </v-list>
      <template v-slot:append>
        <div class="pa-4">
          <v-btn
            v-if="authStore.isAuthenticated && userRole === 0"
            @click="isSponsorNoticeOpen = true"
            text="赞助我们"
            prepend-icon="mdi-heart"
            color="red-accent-2"
            class="w-100 mb-3"
          ></v-btn>

          <v-btn
            href="https://github.com/U-CLIMAX/TCGToolWS"
            target="_blank"
            size="small"
            block
            variant="text"
            class="text-grey-darken-1 text-none"
          >
            <template #prepend>
              <v-img
                src="/github.svg"
                width="20"
                height="20"
                :style="drawerGithubIconStyle"
                class="mr-2"
              ></v-img>
            </template>
            GitHub
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <v-main :scrollable="true">
      <router-view v-slot="{ Component }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

    <v-snackbar v-model="show" :color="color" timeout="2000" location="top" opacity="0.8" eager>
      {{ text }}
    </v-snackbar>

    <AuthDialog ref="authDialog" />
    <SettingsModal v-model="isSettingsModalOpen" />
    <UserProfileModal v-model="isUserProfileModalOpen" @logout="handleLogoutClick" />
    <SponsorNoticeDialog v-model="isSponsorNoticeOpen" @confirm="proceedToPayment" />

    <v-dialog v-model="isLogoutDialogVisible" max-width="320" persistent>
      <v-card title="确定登出" text="您确定要登出目前的帐号吗？">
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text="取消" @click="isLogoutDialogVisible = false"></v-btn>
          <v-btn color="primary" variant="flat" text="确定" @click="confirmLogout"></v-btn>
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

const drawerGithubIconStyle = computed(() => {
  return vuetifyTheme.global.current.value.dark ? { filter: 'invert(1)' } : {}
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

const drawer = ref(false)

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
  { text: '卡片搜索', name: 'GlobalSearch', requiresAuth: false, icon: 'search.svg' },
  { text: '系列卡表', name: 'SeriesCardTable', requiresAuth: false, icon: 'series-card-table.svg' },
  { text: '我的卡组', name: 'Decks', requiresAuth: true, icon: 'deck.svg' },
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
