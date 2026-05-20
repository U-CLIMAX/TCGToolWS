import { presetIcons, defineConfig } from 'unocss'

export default defineConfig({
  presets: [
    presetIcons({
      warn: true,
    }),
  ],
  content: {
    filesystem: ['./node_modules/vuetify/lib/iconsets/mdi-unocss.js'],
  },
})
