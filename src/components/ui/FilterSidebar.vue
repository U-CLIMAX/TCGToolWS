<template>
  <aside
    v-bind="$attrs"
    class="d-flex flex-column flex-shrink-0"
    :style="{ paddingTop: `${smAndUp ? headerOffsetHeight + 18 : 0}px` }"
  >
    <v-sheet
      :rounded="smAndUp ? '3md' : false"
      class="pa-4 ga-4 d-flex flex-column fill-height overflow-y-auto overflow-x-hidden themed-scrollbar"
      :class="{ 'glass-sheet': hasBackgroundImage && !transparent }"
      :color="transparent ? 'transparent' : undefined"
    >
      <div class="d-flex flex-column ga-4">
        <div class="d-flex ga-2 align-center">
          <v-text-field
            class="flex-grow-1"
            label="关键字"
            placeholder="卡号、卡名、效果"
            hide-details="auto"
            v-model="keywordInput"
            variant="underlined"
            :rules="[(v) => !v || v.length >= 2 || '关键字至少输入2个字符']"
          >
            <template v-slot:append-inner>
              <v-tooltip location="bottom">
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon
                    v-bind="props"
                    size="x-small"
                    variant="text"
                    class="mr-2"
                    @click="toggleSearchMode"
                    @mousedown.stop
                    @touchstart.stop
                    :color="
                      filterStore.searchMode === 'fuzzy'
                        ? 'orange-lighten-2'
                        : 'light-blue-lighten-2'
                    "
                  >
                    <v-icon
                      :icon="filterStore.searchMode === 'fuzzy' ? fuzzyIcon : preciseIcon"
                      size="17"
                    ></v-icon>
                  </v-btn>
                </template>
                <span>{{ filterStore.searchMode === 'fuzzy' ? '模糊搜索' : '精准搜索' }}</span>
              </v-tooltip>
            </template>
          </v-text-field>
        </div>

        <v-switch
          label="高罕过滤"
          hide-details
          v-model="filterStore.showUniqueCards"
          color="primary"
          :disabled="!filterStore.hasActiveFilters && globalFilter"
        ></v-switch>

        <v-divider></v-divider>

        <v-select
          label="种类"
          :items="[
            { title: '角色', value: '角色卡' },
            { title: '事件', value: '事件卡' },
            { title: '高潮卡', value: '高潮卡' },
          ]"
          hide-details
          multiple
          chips
          clearable
          v-model="filterStore.selectedCardTypes"
          variant="outlined"
          :menu-props="menuProps"
        ></v-select>

        <v-select
          label="颜色"
          :items="[
            { title: '黄', value: '黄色' },
            { title: '绿', value: '绿色' },
            { title: '红', value: '红色' },
            { title: '蓝', value: '蓝色' },
          ]"
          hide-details
          multiple
          chips
          clearable
          v-model="filterStore.selectedColors"
          variant="outlined"
          :menu-props="menuProps"
        ></v-select>

        <v-autocomplete
          label="产品"
          :items="filterStore.productNames"
          hide-details
          clearable
          v-model="filterStore.selectedProductName"
          variant="outlined"
          :menu-props="menuProps"
        ></v-autocomplete>

        <v-autocomplete
          label="稀有度"
          :items="filterStore.rarities"
          hide-details
          multiple
          chips
          clearable
          v-model="filterStore.selectedRarities"
          variant="outlined"
          :menu-props="menuProps"
        ></v-autocomplete>

        <v-autocomplete
          label="特征"
          :items="filterStore.traits"
          hide-details
          multiple
          chips
          clearable
          v-model="filterStore.selectedTraits"
          variant="outlined"
          :menu-props="menuProps"
        ></v-autocomplete>

        <v-select
          label="等级"
          :items="['0', '1', '2', '3']"
          hide-details
          multiple
          chips
          clearable
          v-model="filterStore.selectedLevels"
          variant="outlined"
          :menu-props="menuProps"
        ></v-select>

        <div>
          <div class="text-caption text-disabled">费用</div>
          <v-range-slider
            hide-details
            :thumb-label="true"
            :min="filterStore.costRange.min"
            :max="filterStore.costRange.max"
            step="1"
            v-model="filterStore.selectedCostRange"
          ></v-range-slider>
        </div>

        <div>
          <div class="text-caption text-disabled">战斗力</div>
          <v-range-slider
            hide-details
            :thumb-label="true"
            :min="Math.floor(filterStore.powerRange.min / 500) * 500"
            :max="filterStore.powerRange.max"
            step="500"
            v-model="filterStore.selectedPowerRange"
          ></v-range-slider>
        </div>
      </div>
    </v-sheet>
  </aside>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { debounce } from 'es-toolkit'
import { useUIStore } from '@/stores/ui'
import { useFilterStore } from '@/stores/filter'
import { useGlobalSearchStore } from '@/stores/globalSearch'

import preciseIcon from '@/assets/ui/precise.svg'
import fuzzyIcon from '@/assets/ui/fuzzy.svg'

const props = defineProps({
  headerOffsetHeight: {
    type: Number,
    required: true,
  },
  transparent: {
    type: Boolean,
    default: false,
  },
  globalFilter: {
    type: Boolean,
    default: false,
  },
})

const { smAndUp } = useDisplay()
const uiStore = useUIStore()
const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const menuProps = computed(() => {
  if (hasBackgroundImage.value) {
    return { contentClass: 'glass-menu' }
  }
  return {}
})

const filterStore = props.globalFilter ? useGlobalSearchStore() : useFilterStore()

const keywordInput = ref(filterStore.keyword)

const updateKeyword = debounce((val) => {
  filterStore.keyword = val
}, 300)

watch(keywordInput, (val) => {
  updateKeyword(val)
})

const toggleSearchMode = () => {
  filterStore.searchMode = filterStore.searchMode === 'fuzzy' ? 'precise' : 'fuzzy'
}
</script>

<style scoped></style>
