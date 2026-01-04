<template>
  <aside
    v-bind="$attrs"
    class="d-flex flex-column flex-shrink-0"
    :style="{ paddingTop: `${smAndUp ? headerOffsetHeight + 18 : 0}px` }"
  >
    <v-sheet
      :rounded="smAndUp ? '3md' : false"
      class="pa-4 ga-4 d-flex flex-column overflow-y-auto overflow-x-hidden themed-scrollbar"
      :class="{
        'glass-sheet': uiStore.backgroundImage && !transparent,
        'fill-height': !containerHeight,
      }"
      :color="transparent ? 'transparent' : undefined"
      :style="containerHeight ? { height: `${containerHeight}px` } : undefined"
    >
      <div class="d-flex flex-column ga-4">
        <div class="d-flex justify-end">
          <v-btn
            size="small"
            variant="text"
            color="primary"
            density="compact"
            prepend-icon="mdi-filter-remove"
            text="清空筛选"
            @click="filterStore.resetFilters()"
            :disabled="props.disabled"
          ></v-btn>
        </div>
        <div class="d-flex ga-2 align-center">
          <v-combobox
            class="flex-grow-1"
            label="关键字"
            placeholder="卡号、卡名、效果"
            :items="allKeywords"
            hide-details="auto"
            v-model="keywordInput"
            variant="underlined"
            density="compact"
            :rules="[(v) => !v || v.length >= 2 || '关键字至少输入2个字符']"
            :disabled="props.disabled"
            hide-no-data
            :return-object="false"
            :auto-select-first="false"
            menu-icon=""
            :menu-props="uiStore.menuProps"
          >
            <template v-slot:prepend-item>
              <v-list-item :title="null" @click="openAddKeywordDialog">
                <v-list-item-title class="text-green">
                  新增关键字
                  <v-icon icon="mdi-plus-circle" size="x-small"></v-icon>
                </v-list-item-title>
              </v-list-item>
              <v-divider></v-divider>
            </template>

            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :title="null">
                <v-list-item-title>{{ item.raw }}</v-list-item-title>
                <template v-slot:append>
                  <v-btn
                    v-if="uiStore.customKeywords.includes(item.raw)"
                    icon
                    variant="text"
                    size="x-small"
                    color="error"
                    @click.stop.prevent="removeKeyword(item.raw)"
                  >
                    <v-icon icon="mdi-delete"></v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </template>

            <template v-slot:append-inner>
              <v-btn
                icon
                size="x-small"
                variant="text"
                class="mr-2"
                @click="toggleSearchMode"
                @mousedown.stop
                @touchstart.stop
                :color="
                  filterStore.searchMode === 'fuzzy' ? 'orange-lighten-2' : 'light-blue-lighten-2'
                "
                :disabled="!keywordInput || keywordInput.length < 2"
                v-tooltip:bottom="filterStore.searchMode === 'fuzzy' ? '模糊搜索' : '精准搜索'"
              >
                <v-icon
                  :icon="filterStore.searchMode === 'fuzzy' ? fuzzyIcon : preciseIcon"
                  size="17"
                ></v-icon>
              </v-btn>
            </template>
          </v-combobox>
        </div>

        <v-switch
          label="高罕过滤"
          hide-details
          v-model="filterStore.showUniqueCards"
          color="primary"
          density="compact"
          :disabled="props.disabled || (!filterStore.hasActiveFilters && globalFilter)"
        ></v-switch>

        <v-switch
          label="魂标筛选"
          hide-details
          v-model="filterStore.showTriggerSoul"
          color="primary"
          density="compact"
          :disabled="props.disabled"
        >
          <template v-slot:label>
            <div class="d-flex align-center">
              <span class="mr-2">魂标筛选</span>
              <v-img
                :src="WsIcon"
                width="16"
                height="16"
                :style="{
                  filter: theme.global.name.value === 'dark' ? 'none' : 'invert(1)',
                  opacity: 0.7,
                }"
              ></v-img>
            </div>
          </template>
        </v-switch>

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
          :menu-props="uiStore.menuProps"
          :disabled="props.disabled"
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
          :menu-props="uiStore.menuProps"
          :disabled="props.disabled"
        ></v-select>

        <v-select
          label="产品"
          :items="filterStore.productNames"
          hide-details
          clearable
          v-model="filterStore.selectedProductName"
          variant="outlined"
          :menu-props="uiStore.menuProps"
          :disabled="props.disabled"
        >
          <template v-slot:item="{ props, item }">
            <v-list-item v-bind="props" :title="null">
              <v-list-item-title style="white-space: normal">
                {{ item.title }}
              </v-list-item-title>
            </v-list-item>
          </template>
        </v-select>

        <v-select
          label="稀有度"
          :items="filterStore.rarities"
          hide-details
          multiple
          chips
          clearable
          v-model="filterStore.selectedRarities"
          variant="outlined"
          :menu-props="uiStore.menuProps"
          :disabled="props.disabled"
        ></v-select>

        <v-select
          label="特征"
          :items="filterStore.traits"
          hide-details
          multiple
          chips
          clearable
          v-model="filterStore.selectedTraits"
          variant="outlined"
          :menu-props="uiStore.menuProps"
          :disabled="props.disabled"
        ></v-select>

        <v-select
          label="等级"
          :items="['0', '1', '2', '3']"
          hide-details
          multiple
          chips
          clearable
          v-model="filterStore.selectedLevels"
          variant="outlined"
          :menu-props="uiStore.menuProps"
          :disabled="props.disabled"
        ></v-select>

        <v-select
          label="魂伤"
          :items="filterStore.souls"
          hide-details
          multiple
          chips
          clearable
          v-model="filterStore.selectedSoul"
          variant="outlined"
          :menu-props="uiStore.menuProps"
          :disabled="props.disabled"
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
            :disabled="props.disabled"
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
            :disabled="props.disabled"
          ></v-range-slider>
        </div>
      </div>
    </v-sheet>

    <v-dialog v-model="addKeywordDialog" max-width="300">
      <v-card>
        <v-card-title>新增关键字</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newKeyword"
            label="关键字"
            :counter="10"
            :rules="[(v) => (v && v.length >= 1 && v.length <= 10) || '长度需在1-10之間']"
            @keydown.enter="saveNewKeyword"
            autofocus
            variant="underlined"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="addKeywordDialog = false">取消</v-btn>
          <v-btn color="primary" variant="text" @click="saveNewKeyword">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { debounce } from 'es-toolkit'
import { useTheme } from 'vuetify'
import { useUIStore } from '@/stores/ui'
import { useFilterStore } from '@/stores/filter'
import { useGlobalSearchStore } from '@/stores/globalSearch'
import WsIcon from '@/assets/ui/ws-icon.svg?url'

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
  containerHeight: {
    type: Number,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const { smAndUp } = useDisplay()
const uiStore = useUIStore()
const theme = useTheme()

const filterStore = props.globalFilter ? useGlobalSearchStore() : useFilterStore()
const defaultKeywords = ['CX联动', '警铃', 'shift', '再演', '集中', '加速', '助太刀', '应援']

const allKeywords = computed(() => {
  return [...uiStore.customKeywords, ...defaultKeywords]
})

const addKeywordDialog = ref(false)
const newKeyword = ref('')

const openAddKeywordDialog = () => {
  newKeyword.value = ''
  addKeywordDialog.value = true
}

const saveNewKeyword = () => {
  if (newKeyword.value && newKeyword.value.length >= 1 && newKeyword.value.length <= 10) {
    uiStore.addCustomKeyword(newKeyword.value)
    addKeywordDialog.value = false
  }
}

const removeKeyword = (keyword) => {
  uiStore.removeCustomKeyword(keyword)
}

const updateStoreKeyword = debounce((val) => {
  filterStore.keyword = val
}, 300)

const keywordInput = computed({
  get: () => filterStore.keyword,
  set: (val) => {
    updateStoreKeyword(val || null)
  },
})

const toggleSearchMode = () => {
  filterStore.searchMode = filterStore.searchMode === 'fuzzy' ? 'precise' : 'fuzzy'
}
</script>

<style scoped></style>
