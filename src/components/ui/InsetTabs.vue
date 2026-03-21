<template>
  <v-tabs
    v-bind="$attrs"
    :model-value="modelValue"
    :color="color"
    :slider-color="sliderColor"
    slider-transition="shift"
    inset
    :inset-radius="100"
    :grow="smAndDown"
    class="v-tabs-inset-custom h-auto text-medium-emphasis"
    :class="[themeClass, { 'w-100': smAndDown }]"
    :density="density"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-tab v-for="opt in options" :key="opt.value" :value="opt.value" :ripple="false" class="ma-0">
      <slot name="tab-item" :option="opt">
        {{ opt.title }}
      </slot>
    </v-tab>
  </v-tabs>
</template>

<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useDisplay } from 'vuetify'

const { smAndDown } = useDisplay()

defineProps({
  modelValue: {
    type: [String, Number],
    required: true,
  },
  options: {
    type: Array,
    required: true,
  },
  color: {
    type: String,
    default: 'primary',
  },
  density: {
    type: String,
    default: 'compact',
  },
})

defineEmits(['update:modelValue'])

const uiStore = useUIStore()

const sliderColor = computed(() => {
  return uiStore.theme === 'dark' ? 'grey-darken-4' : 'grey-lighten-4'
})

const themeClass = computed(() => {
  return uiStore.theme === 'dark' ? 'theme-dark' : 'theme-light'
})
</script>

<style scoped>
.v-tabs-inset-custom.v-tabs--inset {
  /* Removes the internal grey ring */
  box-shadow: none !important;

  /* This adds the soft outer elevation you want */
  /* Format: [horizontal] [vertical] [blur] [spread] [color] */
  filter: drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.2));
}

.v-tabs-inset-custom.theme-dark.v-tabs--inset {
  filter: drop-shadow(0px 0px 2px rgba(255, 255, 255, 0.2));
}

/* 僅在手機端 (小於 960px，對應 Vuetify smAndDown) 佔滿寬度 */
@media (max-width: 959px) {
  .v-tabs-inset-custom.v-tabs--inset {
    max-width: none !important;
  }
}
</style>
