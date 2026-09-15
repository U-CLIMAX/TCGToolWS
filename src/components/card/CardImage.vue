<template>
  <div class="card-img-box" :class="roundedClass" :style="boxStyle">
    <img
      v-if="resolvedUrls.blur"
      :src="resolvedUrls.blur"
      class="card-img-blur"
      :style="imgStyle"
      decoding="async"
      draggable="false"
      aria-hidden="true"
    />
    <img
      v-if="resolvedUrls.base"
      ref="imgRef"
      :src="resolvedUrls.base"
      class="card-img-main"
      :class="{ 'is-loaded': isLoaded }"
      :style="imgStyle"
      decoding="async"
      draggable="false"
      @load="isLoaded = true"
    />
    <slot />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getCardUrls } from '@/utils/getCardImage'

const props = defineProps({
  card: { type: Object, default: null },
  src: { type: String, default: '' },
  blur: { type: String, default: '' },
  aspectRatio: { type: [Number, String, Boolean], default: '400 / 559' },
  rounded: { type: [String, Boolean], default: 'sm' },
  cover: { type: Boolean, default: true },
  contain: { type: Boolean, default: false },
  position: { type: String, default: '' },
  height: { type: [String, Number], default: '' },
  maxHeight: { type: [String, Number], default: '' },
  width: { type: [String, Number], default: '' },
  maxWidth: { type: [String, Number], default: '' },
})

const isLoaded = ref(false)
const imgRef = ref(null)

let base = props.src || null
let blur = props.blur || null

if (!base && props.card?.id && props.card?.cardIdPrefix) {
  const urls = getCardUrls(props.card.cardIdPrefix, props.card.id)
  base = urls.base
  blur = blur || urls.blur
}

const resolvedUrls = { base, blur }

let roundedClass = ''
if (props.rounded === true) {
  roundedClass = 'rounded-sm'
} else if (props.rounded === 'default') {
  roundedClass = 'rounded'
} else if (props.rounded) {
  roundedClass = `rounded-${props.rounded}`
}

const boxStyle = {}
if (props.aspectRatio !== false && props.aspectRatio !== null && props.aspectRatio !== '') {
  boxStyle.aspectRatio = String(props.aspectRatio)
}
if (props.height) {
  boxStyle.height = typeof props.height === 'number' ? `${props.height}px` : props.height
}
if (props.maxHeight) {
  boxStyle.maxHeight =
    typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight
}
if (props.width) {
  boxStyle.width = typeof props.width === 'number' ? `${props.width}px` : props.width
}
if (props.maxWidth) {
  boxStyle.maxWidth = typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth
}

const imgStyle = {}
if (props.contain) {
  imgStyle.objectFit = 'contain'
} else if (props.cover || props.cover === '') {
  imgStyle.objectFit = 'cover'
}
if (props.position) {
  imgStyle.objectPosition = props.position
}

onMounted(() => {
  if (imgRef.value?.complete && imgRef.value?.naturalWidth) {
    isLoaded.value = true
  }
})
</script>

<style scoped>
.card-img-box {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  isolation: isolate;
}

.card-img-box.align-end {
  justify-content: flex-end;
  align-items: stretch !important;
}

.card-img-box > :not(img) {
  z-index: 2;
}

.card-img-blur,
.card-img-main {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}

.card-img-blur {
  z-index: 0;
}

.card-img-main {
  z-index: 1;
  opacity: 0;
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity;
}

.card-img-main.is-loaded {
  opacity: 1;
}
</style>
