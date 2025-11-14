<template>
  <div>
    <v-dialog
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      max-width="90vw"
      max-height="90vh"
      persistent
    >
      <v-card class="d-flex flex-column">
        <v-card-title>图片裁剪</v-card-title>
        <v-card-text class="flex-grow-1 overflow-hidden">
          <div ref="containerRef" class="cropper-container" :style="{ height: containerHeight }">
            <cropper ref="cropperRef" :src="src" :auto-zoom="true" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="onCancel">取消</v-btn>
          <v-btn color="primary" variant="flat" @click="onConfirm">确定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import 'vue-advanced-cropper/dist/theme.classic.css'

const props = defineProps({
  modelValue: Boolean,
  src: String,
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const cropperRef = ref(null)
const containerRef = ref(null)
const containerHeight = ref('250px')

let resizeObserver = null

watch(
  () => props.src,
  (newSrc) => {
    if (newSrc) {
      const image = new Image()
      image.src = newSrc

      image.onload = async () => {
        await nextTick()

        if (containerRef.value) {
          const containerWidth = containerRef.value.clientWidth
          const imageAspectRatio = image.naturalHeight / image.naturalWidth
          const calculatedHeight = containerWidth * imageAspectRatio
          const maxHeight = window.innerHeight * 0.9 - 120
          containerHeight.value = `${Math.min(calculatedHeight, maxHeight)}px`
        }
      }
    }
  },
  { immediate: true }
)

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    if (cropperRef.value) {
      cropperRef.value.refresh()
    }
  })
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

const onConfirm = () => {
  const result = cropperRef.value?.getResult()
  if (result) {
    emit('confirm', result)
    emit('update:modelValue', false)
  }
}

const onCancel = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.cropper-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
