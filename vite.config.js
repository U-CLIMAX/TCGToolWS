import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import VueRouter from 'vue-router/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { cloudflare } from '@cloudflare/vite-plugin'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import vueDevTools from 'vite-plugin-vue-devtools'
import svgLoader from 'vite-svg-loader'
import lqip from 'vite-plugin-lqip'
import UnoCSS from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'

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
    UnoCSS(),
    VueRouter({
      routesFolder: 'src/pages',
      dts: 'src/types/route-map.d.ts',
    }),
    vue(),
    vuetify({
      styles: {
        configFile: 'src/assets/styles/libs/_vuetify.scss',
      },
    }),
    vueDevTools(),
    lqip(),
    svgLoader({
      svgoConfig: {
        multipass: true,
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
        navigateFallback: null,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
    Components({
      dts: 'src/types/components.d.ts',
      extensions: ['vue', 'js'],
      include: [/\.vue$/, /\.vue\?vue/, /\.vue\.[tj]sx?\?vue/, /\.js$/],
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
    cssMinify: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rolldownOptions: {
      transform: {
        define: {
          'import.meta.url': '__import_meta_url__',
          'import.meta.dirname': '__import_meta_dirname__',
          'import.meta.filename': '__import_meta_filename__',
        },
      },
      output: {
        intro:
          "var __import_meta_url__ = (typeof self !== 'undefined' && self.location ? self.location.href : 'http://localhost/');" +
          "var __import_meta_dirname__ = __import_meta_url__.replace(/\\/[^\\/]*$/, '');" +
          "var __import_meta_filename__ = __import_meta_url__.split('/').pop();",
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        codeSplitting: {
          groups: [
            { name: 'lottie', test: /\/lottie-web\//, priority: 30 },
            { name: 'ui', test: /\/vuetify\//, priority: 20 },
            { name: 'excelts', test: /\/@cj-tech-master\/excelts\//, priority: 15 },
            { name: 'vendor', test: /\/vue(?:-router)?\//, priority: 10 },
          ],
        },
      },
    },
  },
})
