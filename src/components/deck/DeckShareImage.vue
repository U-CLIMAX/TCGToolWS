<template>
  <div id="deck-share-image-content" class="share-content-for-screenshot pa-4">
    <div class="header-section">
      <div class="left-section">
        <div class="logo-container">
          <v-img :src="logoUrl" alt="Logo" width="200" eager transition="false"></v-img>
        </div>

        <div class="pl-0">
          <div class="d-flex align-center ga-6">
            <span class="info-label">卡组名称</span>
            <span class="info-value">{{ deckName }}</span>
            <span class="info-label ml-4">卡组代码</span>
            <span class="info-value">{{ deckKey }}</span>
          </div>
        </div>
      </div>

      <div v-if="showQr" class="qr-container">
        <QR :content="shareUrl" :pad="0" class="qr-code" />
      </div>
    </div>

    <div v-if="sortedAndFlatCardList.length > 0" class="card-grid">
      <div v-for="item in sortedAndFlatCardList" :key="`${item.id}-${item.cardIdPrefix}`">
        <div class="position-relative">
          <v-img
            :src="useCardImage(item.cardIdPrefix, item.id).value"
            :aspect-ratio="400 / 559"
            cover
            eager
            transition="false"
            @load="onImageLoad"
          >
            <template #error>
              <v-img src="/placehold.webp" :aspect-ratio="400 / 559" cover />
            </template>
          </v-img>
          <div class="quantity-badge">{{ item.quantity }}</div>
        </div>
      </div>
    </div>
    <div v-else class="text-center d-flex align-center justify-center fill-height">N/A</div>
  </div>
</template>

<script setup>
import { useCardImage } from '@/composables/useCardImage.js'
import { computed, ref, watch, readonly } from 'vue'
import { QR } from '@/components/common/QR.js'
import { sortDeckCards } from '@/utils/deckSort.js'

import logoUrl from '@/assets/ui/logo.webp'

const props = defineProps({
  deckCards: {
    type: Object,
    required: true,
  },
  deckKey: {
    type: String,
    required: true,
  },
  deckName: {
    type: String,
    required: true,
  },
})

const showQr = ref(true)
const toggleQrCode = (state) => {
  showQr.value = state
}

const shareUrl = `${window.location.origin}/share-decks/${props.deckKey}`

// 排序
const sortedAndFlatCardList = computed(() => {
  if (!props.deckCards || Object.keys(props.deckCards).length === 0) {
    return []
  }
  const cardList = Object.values(props.deckCards)
  return sortDeckCards(cardList)
})

const loadedImagesCount = ref(0)

const totalImages = computed(() => sortedAndFlatCardList.value.length)
const allImagesLoaded = computed(() => {
  if (totalImages.value === 0) {
    return true
  }
  return loadedImagesCount.value === totalImages.value
})

const onImageLoad = () => {
  if (loadedImagesCount.value < totalImages.value) {
    loadedImagesCount.value++
  }
}

watch(
  () => props.deckCards,
  () => {
    loadedImagesCount.value = 0
  },
  { deep: true, immediate: true }
)

defineExpose({
  allImagesLoaded: readonly(allImagesLoaded),
  toggleQrCode,
})
</script>

<style scoped>
.share-content-for-screenshot {
  position: absolute;
  left: -9999px;
  top: -9999px;
  z-index: -1;
  width: 1024px;
  overflow: visible;
  box-sizing: border-box;
  background-color: rgb(255, 255, 255);
  font-family:
    'Microsoft JhengHei', 'PingFang TC', 'Heiti TC', 'Noto Sans TC', 'Noto Sans CJK TC', sans-serif;
  font-weight: 400;
  color: #000;
}

.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.left-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
}

.logo-container {
  flex: 0 0 auto;
}

.info-label {
  font-weight: bold;
  color: #000;
  font-size: 16px;
}

.info-value {
  color: #000;
  font-size: 16px;
}

.qr-container {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-code {
  width: 80px;
  aspect-ratio: 1;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 24px 12px;
  padding-top: 10px;
}

.quantity-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: none;
  padding: 0;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
</style>
