import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-unocss'
import { VPie } from 'vuetify/labs/VPie'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { piniaVersioningPlugin } from '@/plugins/pinia-versioning.js'
import { useUIStore } from './stores/ui'
import { registerSW } from 'virtual:pwa-register'
import { isTauri } from '@/utils/isTauri'

import 'virtual:uno.css'
import '@/assets/styles/main.css'
import 'vuetify/styles'

const bootstrap = async () => {
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

  const app = createApp(App)
  const pinia = createPinia()
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

  pinia.use(piniaVersioningPlugin)
  pinia.use(piniaPluginPersistedstate)

  app.use(pinia)

  const uiStore = useUIStore()

  uiStore.setLoading(false)
  uiStore.restoreBackgroundImage()

  app.use(router)
  app.use(vuetify)

  app.mount('#app')
}

bootstrap()
