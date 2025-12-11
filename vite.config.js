import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { cloudflare } from '@cloudflare/vite-plugin'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import vuetify from 'vite-plugin-vuetify'
import vueDevTools from 'vite-plugin-vue-devtools'
import svgLoader from 'vite-svg-loader'
import lqip from 'vite-plugin-lqip'
import Sitemap from 'vite-plugin-sitemap'

const staticRoutes = ['/', '/home', '/series', '/search/ws', '/search/wsr']

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    allowedHosts: true,
    cors: true,
  },
  preview: {
    cors: true,
  },
  plugins: [
    vue(),
    vueDevTools(),
    lqip(),
    Sitemap({
      hostname: 'https://uclimax.cn',
      dynamicRoutes: staticRoutes,
      generateRobotsTxt: true,
      exclude: ['/client', '/client/stats', '/tcgtoolws/stats'],
      readable: false,
    }),
    svgLoader({
      svgoConfig: {
        multipass: true,
      },
    }),
    vuetify({
      styles: {
        configFile: 'src/assets/styles/libs/_vuetify.scss',
      },
    }),
    visualizer({
      emitFile: true,
      filename: 'stats.html',
    }),
    legacy({
      targets: ['defaults'],
    }),
    cloudflare(),
    VitePWA({
      workbox: {
        globPatterns: [],
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['brotli-wasm'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],
          ui: ['vuetify'],
          lottie: ['lottie-web'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})
