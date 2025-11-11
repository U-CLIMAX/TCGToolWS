<template>
  <v-app id="app" class="grid-background" :style="appStyle">
    <HomeBackground v-show="isHomeRoute" />
    <v-app-bar
      scroll-behavior="elevate"
      scroll-threshold="160"
      height="50"
      :color="isHomeRoute ? '#212121' : vuetifyTheme.global.current.value.dark ? 'grey-darken-3' : 'grey-lighten-3'"
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
              <v-btn
                v-if="!item.requiresAuth || authStore.isAuthenticated"
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

        <v-tooltip text="设定" location="bottom">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" @click="isSettingsModalOpen = true" icon="mdi-cog"></v-btn>
          </template>
        </v-tooltip>

        <template v-if="!isInSpecialFlow">
          <v-tooltip :text="authStore.isAuthenticated ? '登出' : '登录/注册'" location="bottom">
            <template v-slot:activator="{ props }">
              <v-btn
                v-if="authStore.isAuthenticated"
                v-bind="props"
                @click="handleLogoutClick"
                icon="mdi-logout"
                color="red-lighten-1"
              ></v-btn>
              <v-btn
                v-else
                v-bind="props"
                @click="handleLogin"
                icon="mdi-login"
                color="teal-lighten-1"
              ></v-btn>
            </template>
          </v-tooltip>
        </template>
      </template>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" temporary>
      <v-list class="py-0">
        <template v-for="item in navItems" :key="item.to">
          <v-list-item
            v-if="!item.requiresAuth || authStore.isAuthenticated"
            :to="{ name: item.name }"
            :title="item.text"
          >
            <template #prepend>
              <v-icon :icon="navIcons[item.icon]" size="24"></v-icon>
            </template>
          </v-list-item>
        </template>
      </v-list>
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

    <v-dialog v-model="isLogoutDialogVisible" max-width="320" persistent>
      <v-card title="确认登出" text="您确定要登出目前的帐号吗？">
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text="取消" @click="isLogoutDialogVisible = false"></v-btn>
          <v-btn color="primary" variant="flat" text="确认" @click="confirmLogout"></v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Global Loading Overlay -->
    <v-overlay v-model="uiStore.isLoading" class="d-flex align-center justify-center" persistent>
      <v-progress-circular
        v-if="uiStore.isLoading"
        color="primary"
        indeterminate
        size="64"
      ></v-progress-circular>
    </v-overlay>
  </v-app>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useTheme, useDisplay } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/composables/useSnackbar'
import { usePerformanceManager } from '@/composables/usePerformanceManager'
import AuthDialog from '@/components/ui/AuthDialog.vue'
import SettingsModal from '@/components/ui/SettingsModal.vue'
import HomeBackground from '@/components/common/HomeBackground.vue'

import titleDarkImg from '@/assets/ui/title-dark.webp'
import titleLightImg from '@/assets/ui/title-light.webp'
import titleMonochrome from '@/assets/ui/title-monochrome.webp'
import HomeIcon from '@/assets/ui/home.svg'
import SeriesCardTableIcon from '@/assets/ui/series-card-table.svg'
import DeckIcon from '@/assets/ui/deck.svg'
import SearchIcon from '@/assets/ui/search.svg'

const authStore = useAuthStore()
const authDialog = ref(null)
const { show, text, color, triggerSnackbar } = useSnackbar()
const route = useRoute()
const isSettingsModalOpen = ref(false)
const titleImg = computed(() => {
  const isLightTheme = vuetifyTheme.global.name.value === 'light'
  return isHomeRoute.value ? titleMonochrome : isLightTheme ? titleLightImg : titleDarkImg
})

const isHomeRoute = computed(() => route.name === 'Home')

const isInSpecialFlow = computed(() => {
  return !!route.meta.isSpecialFlow
})

const handleLogin = () => {
  authDialog.value?.open()
}

const isLogoutDialogVisible = ref(false)
const handleLogoutClick = () => {
  isLogoutDialogVisible.value = true
}

const confirmLogout = () => {
  authStore.logout()
  triggerSnackbar('您已成功登出。')
  isLogoutDialogVisible.value = false
}

const drawer = ref(false)

const navIcons = {
  'home.svg': HomeIcon,
  'series-card-table.svg': SeriesCardTableIcon,
  'deck.svg': DeckIcon,
  'search.svg': SearchIcon,
}

const navItems = [
  { text: '首页', name: 'Home', requiresAuth: false, icon: 'home.svg' },
  { text: '卡片搜索', name: 'GlobalSearch', requiresAuth: false, icon: 'search.svg' },
  { text: '系列卡表', name: 'SeriesCardTable', requiresAuth: false, icon: 'series-card-table.svg' },
  { text: '我的卡组', name: 'Decks', requiresAuth: true, icon: 'deck.svg' },
]

const vuetifyTheme = useTheme()
const uiStore = useUIStore()

usePerformanceManager()

const { mdAndDown, smAndDown } = useDisplay()

const titleImgStyle = computed(() => {
  return {
    maxWidth: mdAndDown.value ? '140px' : '170px',
  }
})

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

/* 設定給效果小圖標用的樣式 */
.inline-icon {
  height: 1rem;
  vertical-align: -0.15rem;
}
</style>
