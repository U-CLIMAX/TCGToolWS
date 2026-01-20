<template>
  <div v-if="allCards.length > 0" class="d-flex pb-4 align-center justify-center">
    <v-card
      rounded="xxl"
      elevation="2"
      :class="{ 'glass-sheet': hasBackgroundImage, 'px-10': smAndUp, 'w-100': !smAndUp }"
    >
      <!-- 桌面版：左右佈局 -->
      <div v-if="smAndUp" class="d-flex align-center justify-center">
        <!-- 左側：圓餅圖和圖例 -->
        <div class="flex-1 d-flex align-center justify-center pa-6">
          <v-pie
            :items="pieChartItems"
            :legend="{ position: 'right' }"
            class="pa-2"
            gap="2"
            inner-cut="70"
            item-key="id"
            rounded="2"
            :hover-scale="0"
            :size="250"
            :animation="{ duration: 1000, easing: 'easeInOutCubic' }"
            hide-slice
            reveal
          >
            <template #center>
              <div class="text-center">
                <div class="font-DINCond text-h2 font-weight-black">
                  {{ totalCardCount }}
                </div>
                <div class="text-disabled text-body-2 mt-1">张卡</div>
              </div>
            </template>
            <template #legend="{ items }">
              <v-list class="bg-transparent" density="compact">
                <v-list-item
                  v-for="item in items"
                  :key="item.key"
                  class="px-2 my-1 ga-6 h-100"
                  rounded="lg"
                >
                  <template #prepend>
                    <v-avatar :color="item.color" :size="20" class="mr-3" rounded="circle" />
                  </template>
                  <v-list-item-title>{{ item.title }}</v-list-item-title>
                  <template #append>
                    <div class="font-DINCond font-weight-bold">{{ item.value }}</div>
                  </template>
                </v-list-item>
              </v-list>
            </template>
          </v-pie>
        </div>

        <v-divider vertical></v-divider>

        <!-- 右側：統計數據 -->
        <div class="d-flex flex-column justify-center pa-6" style="min-width: 180px">
          <div class="text-center px-4 py-4">
            <div class="font-DINCond text-h5 mb-1">{{ eventCardCount }}</div>
            <div class="text-body-2 text-disabled">事件卡</div>
          </div>
          <v-divider></v-divider>
          <div class="text-center px-4 py-4">
            <div class="font-DINCond text-h5 mb-1">{{ climaxCardCount }}</div>
            <div class="text-body-2 text-disabled">高潮卡</div>
          </div>
          <v-divider></v-divider>
          <div class="text-center px-4 py-4">
            <div class="font-DINCond text-h5 mb-1">{{ totalSoulCount }}</div>
            <div class="text-body-2 text-disabled">触发魂标</div>
          </div>
        </div>
      </div>

      <!-- 移動端：上下佈局 -->
      <div v-else>
        <div class="d-flex flex-wrap align-center justify-center pa-4">
          <v-pie
            :items="pieChartItems"
            :legend="{ position: 'bottom' }"
            class="pa-2"
            gap="2"
            inner-cut="70"
            item-key="id"
            rounded="2"
            :hover-scale="0"
            :size="200"
            :animation="{ duration: 1000, easing: 'easeInOutCubic' }"
            hide-slice
            reveal
          >
            <template #center>
              <div class="text-center">
                <div class="text-h4 font-weight-bold">
                  {{ totalCardCount }}
                </div>
                <div class="text-disabled text-body-2 mt-1">张卡</div>
              </div>
            </template>
            <template #legend="{ items, toggle, isActive }">
              <div>
                <v-list class="bg-transparent" density="compact">
                  <v-list-item
                    v-for="item in items"
                    :key="item.key"
                    :class="['px-2 my-1', { 'opacity-40': !isActive(item) }]"
                    class="ga-6 h-100"
                    :title="item.title"
                    rounded="lg"
                    link
                    @click="toggle(item)"
                  >
                    <template #prepend>
                      <v-avatar
                        :color="item.color"
                        :size="20"
                        class="mr-3"
                        rounded="circle"
                      ></v-avatar>
                    </template>
                    <template #append>
                      <div class="font-weight-bold">{{ item.value }}</div>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
            </template>
          </v-pie>
        </div>
        <v-divider></v-divider>
        <v-card-text class="d-flex text-center py-4">
          <div class="flex-1 px-2 w-100">
            <div class="text-h5 font-weight-bold mb-1">{{ eventCardCount }}</div>
            <div class="text-body-2 text-disabled">事件卡</div>
          </div>
          <v-divider vertical></v-divider>
          <div class="flex-1 px-2 w-100">
            <div class="text-h5 font-weight-bold mb-1">{{ climaxCardCount }}</div>
            <div class="text-body-2 text-disabled">高潮卡</div>
          </div>
          <v-divider vertical></v-divider>
          <div class="flex-1 px-2 w-100">
            <div class="text-h5 font-weight-bold mb-1">{{ totalSoulCount }}</div>
            <div class="text-body-2 text-disabled">触发魂标</div>
          </div>
        </v-card-text>
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useUIStore } from '@/stores/ui'
import { useColorExtractor } from '@/composables/useColorExtractor'

const props = defineProps({
  groupedCards: { type: Map, required: true },
  groupBy: { type: String, required: true },
})

const { smAndUp } = useDisplay()
const uiStore = useUIStore()

const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)
const backgroundImageSrc = computed(() => uiStore.backgroundImage?.src)

const { colors: adaptiveColors } = useColorExtractor(backgroundImageSrc)
const allCards = computed(() => Array.from(props.groupedCards.values()).flat())
const totalCardCount = computed(() => allCards.value.reduce((sum, card) => sum + card.quantity, 0))
const eventCardCount = computed(() =>
  allCards.value.filter((c) => c.type === '事件卡').reduce((s, c) => s + c.quantity, 0)
)
const climaxCardCount = computed(() =>
  allCards.value.filter((c) => c.type === '高潮卡').reduce((s, c) => s + c.quantity, 0)
)
const totalSoulCount = computed(() =>
  allCards.value.reduce((s, c) => s + c.quantity * (c.trigger_soul_count || 0), 0)
)

const addAlpha = (color, alpha) => {
  if (color.startsWith('rgba') || color.startsWith('hsla')) {
    return color
  }
  if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`)
  }
  if (color.startsWith('hsl')) {
    return color.replace('hsl', 'hsla').replace(')', `, ${alpha})`)
  }
  if (color.startsWith('#')) {
    const alphaHex = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0')
    return `${color}${alphaHex}`
  }
  return color
}

const getPaletteForGroup = (groupName, count) => {
  const baseHSL = {
    blueGreen: { hStart: 170, hEnd: 190, sStart: 100, sEnd: 70, lStart: 25, lEnd: 75 },
    tealOrange: { hStart: 15, hEnd: 35, sStart: 100, sEnd: 80, lStart: 30, lEnd: 70 },
    purplePink: { hStart: 280, hEnd: 320, sStart: 50, sEnd: 65, lStart: 35, lEnd: 75 },
    brownYellow: { hStart: 30, hEnd: 50, sStart: 65, sEnd: 95, lStart: 20, lEnd: 80 },
  }

  const getPaletteKey = (groupName) => {
    switch (groupName) {
      case 'level':
        return 'blueGreen'
      case 'cost':
        return 'tealOrange'
      case 'type':
        return 'purplePink'
      default:
        return 'brownYellow'
    }
  }

  const config = baseHSL[getPaletteKey(groupName)]
  const colors = []

  for (let i = 0; i < count; i++) {
    const progress = count > 1 ? i / (count - 1) : 0
    const h = config.hStart + (config.hEnd - config.hStart) * progress
    const s = config.sStart + (config.sEnd - config.sStart) * progress
    const l = config.lStart + (config.lEnd - config.lStart) * progress
    colors.push(`hsl(${Math.round(h)}, ${s}%, ${l}%)`)
  }

  return colors
}
const pieChartItems = computed(() => {
  const groupCount = props.groupedCards.size
  const activePalette = getPaletteForGroup(props.groupBy, groupCount)

  const items = []
  let index = 0
  const colorMapping = {
    红色: '#E85D75',
    绿色: '#52B788',
    蓝色: '#4EA8DE',
    黄色: '#FFB703',
  }

  for (const [groupKey, groupCards] of props.groupedCards.entries()) {
    const totalQuantity = groupCards.reduce((sum, card) => sum + card.quantity, 0)
    let title = groupKey

    switch (props.groupBy) {
      case 'level':
        title = groupKey === 'CX' ? '高潮卡' : `等级 ${groupKey}`
        break
      case 'color':
        break
      case 'cost':
        title = `费用 ${groupKey}`
        break
    }

    let sliceColor
    if (hasBackgroundImage.value && uiStore.useAdaptiveColor && adaptiveColors.value.length === 0) {
      sliceColor = 'transparent'
    } else if (
      hasBackgroundImage.value &&
      uiStore.useAdaptiveColor &&
      adaptiveColors.value.length > 0
    ) {
      sliceColor = adaptiveColors.value[index % adaptiveColors.value.length]
    } else if (props.groupBy === 'color') {
      sliceColor = colorMapping[groupKey] || '#BDBDBD'
    } else {
      sliceColor = activePalette[index]
    }

    if (hasBackgroundImage.value) {
      sliceColor = addAlpha(sliceColor, 0.85)
    }
    items.push({ id: index, title, value: totalQuantity, color: sliceColor })
    index++
  }

  return items
})
</script>
