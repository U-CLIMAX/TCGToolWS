import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-unocss'
import { VPie } from 'vuetify/labs/VPie'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import router from './router'
import { piniaVersioningPlugin } from '@/plugins/pinia-versioning.js'
import { preserveTitlePlugin } from '@/plugins/unhead-preserve-title.js'
import { useUIStore } from '@/stores/ui'
import { isTauri } from '@/utils/isTauri'

import 'virtual:uno.css'
import '@/assets/styles/main.css'
import 'vuetify/styles'

const bootstrap = async () => {
  // Web 端專屬監聽與 PWA 註冊
  if (!isTauri) {
    // 避免 Safari 的 bfcache 導致無法獲取最新的 index.html
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        window.location.reload()
      }
    })

    // 處理 Web 端 Vite 按需加載 chunk 404
    window.addEventListener('vite:preloadError', (event) => {
      event.preventDefault?.()
      window.location.reload()
    })

    registerSW({
      immediate: true,
      onNeedRefresh() {
        window.location.reload()
      },
    })
  }

  // 1. 初始化 Vue 應用與外掛實例
  const app = createApp(App)
  const head = createHead({
    plugins: [preserveTitlePlugin],
  })
  const pinia = createPinia()

  // 2. 配置 Pinia 外掛
  pinia.use(piniaVersioningPlugin)
  pinia.use(piniaPluginPersistedstate)

  // 3. 配置 Vuetify
  const vuetify = createVuetify({
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {
        mdi,
      },
    },
    theme: {
      defaultTheme: 'dark',
      themes: {
        light: {
          colors: {
            'default': '#EEEEEE',
            'ws-rose': '#e85a6a',
            'ws-cn': '#52CFCF',
            'grey-btn': '#455A64',
            'currency': '#F6C400',
          },
        },
        dark: {
          colors: {
            'default': '#424242',
            'ws-rose': '#FF8391',
            'ws-cn': '#7ae3d2',
            'grey-btn': '#ECEFF1',
            'currency': '#FFD54F',
          },
        },
      },
    },
    components: {
      VPie,
    },
  })

  // 4. 註冊所有全域外掛
  app.use(head)
  app.use(pinia)
  app.use(router)
  app.use(vuetify)

  // 5. 初始化 UI Store 狀態
  const uiStore = useUIStore()
  uiStore.setLoading(false)
  uiStore.restoreBackgroundImage()

  // 6. 掛載應用
  app.mount('#app')
}

bootstrap()
