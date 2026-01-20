import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { cloudflare } from '@cloudflare/vite-plugin'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import vueDevTools from 'vite-plugin-vue-devtools'
import svgLoader from 'vite-svg-loader'
import lqip from 'vite-plugin-lqip'

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
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lottie-web')) {
              return 'lottie'
            }
            if (id.includes('vuetify')) {
              return 'ui'
            }
            if (id.includes('vue') || id.includes('vue-router')) {
              return 'vendor'
            }
          }
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
