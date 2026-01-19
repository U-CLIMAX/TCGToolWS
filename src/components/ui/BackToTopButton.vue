<template>
  <v-fade-transition>
    <v-btn
      v-show="isFabVisible"
      position="fixed"
      location="bottom right"
      icon
      size="large"
      class="ma-4 back-to-top-btn"
      :class="{ 'mb-14': smAndDown }"
      @click="scrollToTop"
    >
      <v-img
        :src="WsIcon"
        alt="Back to top"
        width="28"
        height="28"
        draggable="false"
        :style="{ filter: iconFilterStyle }"
      />
    </v-btn>
  </v-fade-transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useTheme, useDisplay } from 'vuetify'
import WsIcon from '@/assets/ui/ws-icon.svg?url'

const props = defineProps({
  scrollContainer: {
    type: Object,
    default: null,
  },
})

const theme = useTheme()
const { smAndDown } = useDisplay()
const isFabVisible = ref(false)

const iconFilterStyle = computed(() => {
  return theme.global.name.value === 'light' ? 'invert(1)' : 'none'
})

const onScroll = () => {
  if (!props.scrollContainer) return
  const scrollTop = props.scrollContainer.scrollTop
  isFabVisible.value = scrollTop > 300
}

const scrollToTop = () => {
  if (props.scrollContainer) {
    props.scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const setupScrollListener = (container) => {
  if (container) {
    container.addEventListener('scroll', onScroll)
  }
}

const cleanupScrollListener = (container) => {
  if (container) {
    container.removeEventListener('scroll', onScroll)
  }
}

onMounted(() => {
  if (props.scrollContainer) {
    setupScrollListener(props.scrollContainer)
  }
})

onUnmounted(() => {
  if (props.scrollContainer) {
    cleanupScrollListener(props.scrollContainer)
  }
})

watch(
  () => props.scrollContainer,
  (newContainer, oldContainer) => {
    cleanupScrollListener(oldContainer)
    setupScrollListener(newContainer)
  }
)
</script>

<style scoped>
.back-to-top-btn {
  opacity: 0.8;
  z-index: 1000;
}
</style>
