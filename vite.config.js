import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { cloudflare } from '@cloudflare/vite-plugin'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import vueDevTools from 'vite-plugin-vue-devtools'
import svgLoader from 'vite-svg-loader'
import lqip from 'vite-plugin-lqip'

let detectGpuVersion = ''
try {
  const pkgPath = path.resolve(process.cwd(), 'node_modules/detect-gpu/package.json')
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    detectGpuVersion = pkg.version
    console.log(`[Vite] Detected detect-gpu version: ${detectGpuVersion}`)
  }
  // eslint-disable-next-line no-unused-vars
} catch (e) {
  console.warn('[Vite] Could not resolve detect-gpu version, defaulting to empty.')
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __DETECT_GPU_VERSION__: JSON.stringify(detectGpuVersion),
  },
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
