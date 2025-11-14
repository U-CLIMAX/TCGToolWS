import { createVuetify } from 'vuetify'
import { VPie } from 'vuetify/labs/VPie'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { piniaVersioningPlugin } from '@/plugins/pinia-versioning.js'
import { useUIStore } from './stores/ui'
import { registerSW } from 'virtual:pwa-register'

import '@/assets/styles/main.css'
import 'vuetify/styles'

const bootstrap = async () => {
  // 避免 Safari 的 bfcache 導致無法獲取最新的 index.html
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      window.location.reload()
    }
  })

  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('New content available, reloading...')
      window.location.reload()
    },
  })

  const app = createApp(App)
  const pinia = createPinia()
  const vuetify = createVuetify({
    theme: {
      defaultTheme: 'system',
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
  await uiStore.restoreBackgroundImage()

  app.use(router)
  app.use(vuetify)

  app.mount('#app')
}

bootstrap()
