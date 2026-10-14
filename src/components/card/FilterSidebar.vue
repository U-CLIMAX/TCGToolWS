<template>
  <aside
    v-bind="$attrs"
    class="d-flex flex-column flex-shrink-0"
    :style="{ paddingTop: `${smAndUp ? headerOffsetHeight + 18 : 0}px` }"
  >
    <v-sheet
      :rounded="smAndUp ? '3md' : false"
      class="d-flex flex-column"
      :class="{
        'glass-sheet': uiStore.backgroundImage && !transparent,
        'fill-height': !containerHeight,
      }"
      :color="transparent ? 'transparent' : undefined"
      :style="containerHeight ? { height: `${containerHeight}px` } : undefined"
    >
      <div
        class="pa-4 ga-4 d-flex flex-column overflow-y-auto overflow-x-hidden themed-scrollbar fill-height"
      >
        <div class="d-flex justify-end">
          <v-btn
            size="small"
            variant="text"
            color="primary"
            density="compact"
            prepend-icon="i-mdi:filter-remove"
            text="清空筛选"
            @click="filterStore.resetFilters()"
            :disabled="props.disabled"
          ></v-btn>
        </div>
        <div class="d-flex ga-2 align-center">
          <v-combobox
            class="flex-grow-1 font-weight-light"
            :label="`关键字 (${filterStore.searchMode === 'fuzzy' ? '模糊搜索' : '精准搜索'})`"
            placeholder="卡号、卡名、效果"
            :items="allKeywords"
            hide-details="auto"
            v-model="filterStore.keyword"
            variant="underlined"
            density="compact"
            :rules="KEYWORD_RULES"
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
                  <v-icon icon="i-mdi:plus-circle" size="x-small" />
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
                    <v-icon icon="i-mdi:delete" />
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
                :disabled="!filterStore.keyword || filterStore.keyword.length < 2"
                v-tooltip:bottom="filterStore.searchMode === 'fuzzy' ? '模糊搜索' : '精准搜索'"
              >
                <v-icon
                  :icon="filterStore.searchMode === 'fuzzy' ? fuzzyIcon : preciseIcon"
                  size="17"
                />
              </v-btn>
            </template>
          </v-combobox>
        </div>

        <div class="mt-n3 d-flex align-center">
          <div class="native-chip-group">
            <button
              v-for="target in SEARCH_TARGET_OPTIONS"
              :key="target.value"
              type="button"
              class="native-chip native-chip--small font-weight-regular"
              :class="{
                'native-chip--selected text-primary': isSelected('searchTargets', target.value),
              }"
              :disabled="props.disabled"
              :aria-pressed="isSelected('searchTargets', target.value)"
              @click="toggleFilterItem('searchTargets', target.value)"
            >
              {{ target.label }}
            </button>
          </div>
        </div>

        <v-switch
          label="高罕过滤"
          hide-details
          v-model="filterStore.showUniqueCards"
          color="primary"
          density="compact"
          :disabled="isSwitchDisabled"
        ></v-switch>

        <v-switch
          label="魂标筛选"
          hide-details
          v-model="filterStore.showTriggerSoul"
          color="primary"
          density="compact"
          :disabled="isSwitchDisabled"
        >
          <template v-slot:label>
            <div class="d-flex align-center">
              <span class="mr-2">魂标筛选</span>
              <img
                :src="WsIcon"
                width="16"
                height="16"
                :style="{
                  filter: theme.global.name.value === 'dark' ? 'none' : 'invert(1)',
                  opacity: 0.7,
                }"
              />
            </div>
          </template>
        </v-switch>

        <v-divider></v-divider>

        <!-- 种类 -->
        <div>
          <div class="text-caption font-weight-light text-disabled mb-1">种类</div>
          <div class="native-chip-group">
            <button
              v-for="type in CARD_TYPE_OPTIONS"
              :key="type"
              type="button"
              class="native-chip font-weight-medium"
              :class="{
                'native-chip--selected text-primary': isSelected('selectedCardTypes', type),
              }"
              :disabled="props.disabled"
              :aria-pressed="isSelected('selectedCardTypes', type)"
              @click="toggleFilterItem('selectedCardTypes', type)"
            >
              {{ type }}
            </button>
          </div>
        </div>

        <!-- 等级 -->
        <div>
          <div class="text-caption font-weight-light text-disabled mb-1">等级</div>
          <div class="native-chip-group">
            <button
              v-for="lvl in filterStore.levels"
              :key="lvl"
              type="button"
              class="native-chip font-weight-medium"
              :class="{
                'native-chip--selected text-primary': isSelected('selectedLevels', lvl),
              }"
              :disabled="props.disabled"
              :aria-pressed="isSelected('selectedLevels', lvl)"
              @click="toggleFilterItem('selectedLevels', lvl)"
            >
              {{ lvl }}
            </button>
          </div>
        </div>

        <!-- 费用 -->
        <div v-if="filterStore.costs?.length">
          <div class="text-caption font-weight-light text-disabled mb-1">费用</div>
          <div class="native-chip-group">
            <button
              v-for="c in filterStore.costs"
              :key="c"
              type="button"
              class="native-chip font-weight-medium"
              :class="{
                'native-chip--selected text-primary': isSelected('selectedCosts', c),
              }"
              :disabled="props.disabled"
              :aria-pressed="isSelected('selectedCosts', c)"
              @click="toggleFilterItem('selectedCosts', c)"
            >
              {{ c }}
            </button>
          </div>
        </div>

        <!-- 魂伤 -->
        <div v-if="filterStore.souls?.length">
          <div class="text-caption font-weight-light text-disabled mb-1">魂伤</div>
          <div class="native-chip-group">
            <button
              v-for="s in filterStore.souls"
              :key="s"
              type="button"
              class="native-chip font-weight-medium"
              :class="{
                'native-chip--selected text-primary': isSelected('selectedSoul', s),
              }"
              :disabled="props.disabled"
              :aria-pressed="isSelected('selectedSoul', s)"
              @click="toggleFilterItem('selectedSoul', s)"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <!-- 颜色 -->
        <div>
          <div class="text-caption font-weight-light text-disabled mb-1">颜色</div>
          <div class="native-chip-group">
            <button
              v-for="color in COLOR_OPTIONS"
              :key="color.value"
              type="button"
              class="native-chip font-weight-medium"
              :class="isSelected('selectedColors', color.value) && color.activeClass"
              :disabled="props.disabled"
              :aria-pressed="isSelected('selectedColors', color.value)"
              @click="toggleFilterItem('selectedColors', color.value)"
            >
              {{ color.label }}
            </button>
          </div>
        </div>

        <!-- 产品 -->
        <div>
          <div class="text-caption font-weight-light text-disabled mb-1">产品</div>
          <v-select
            label="产品"
            :items="filterStore.productNames"
            hide-details
            clearable
            v-model="filterStore.selectedProductName"
            variant="outlined"
            rounded="pill"
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
        </div>

        <!-- 稀有度 -->
        <div>
          <div class="text-caption font-weight-light text-disabled mb-1">稀有度</div>
          <v-select
            label="稀有度"
            :items="filterStore.rarities"
            hide-details
            multiple
            chips
            clearable
            v-model="filterStore.selectedRarities"
            variant="outlined"
            rounded="pill"
            :menu-props="uiStore.menuProps"
            :disabled="props.disabled"
          ></v-select>
        </div>

        <!-- 特征 -->
        <div>
          <div class="text-caption font-weight-light text-disabled mb-1">特征</div>
          <v-select
            label="特征"
            :items="filterStore.traits"
            hide-details
            multiple
            chips
            clearable
            v-model="filterStore.selectedTraits"
            variant="outlined"
            rounded="pill"
            :menu-props="uiStore.menuProps"
            :disabled="props.disabled"
          ></v-select>
        </div>

        <div>
          <div class="text-caption font-weight-light text-disabled">
            战斗力
            <span class="pa-1 px-2 rounded-pill border-md">
              {{ powerRangeText }}
            </span>
          </div>
          <v-range-slider
            hide-details
            :thumb-label="true"
            :min="Math.floor(filterStore.powerRange.min / 500) * 500"
            :max="filterStore.powerRange.max"
            step="500"
            :model-value="isDraggingPower ? localPower : filterStore.selectedPowerRange"
            @start="onPowerStart"
            @update:model-value="localPower = $event"
            @end="onPowerEnd"
            :disabled="props.disabled"
            thumb-size="15"
          ></v-range-slider>
        </div>
      </div>
    </v-sheet>

    <v-dialog v-model="addKeywordDialog" max-width="320">
      <v-card class="rounded-2lg pa-2">
        <v-card-title>新增关键字</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newKeyword"
            label="关键字"
            :counter="10"
            :rules="NEW_KEYWORD_RULES"
            @keydown.enter="saveNewKeyword"
            autofocus
            variant="underlined"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="addKeywordDialog = false">取消</v-btn>
          <v-btn color="primary" variant="tonal" @click="saveNewKeyword">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDisplay } from 'vuetify'
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

const KEYWORD_RULES = Object.freeze([(v) => !v || v.length >= 2 || '关键字至少输入2个字符'])
const NEW_KEYWORD_RULES = Object.freeze([
  (v) => (v && v.length >= 1 && v.length <= 10) || '长度需在1-10之間',
])

const DEFAULT_KEYWORDS = Object.freeze([
  'CX联动',
  '警铃',
  'shift',
  '再演',
  '集中',
  '加速',
  '助太刀',
  '应援',
  'LINK',
  'replay',
])

const SEARCH_TARGET_OPTIONS = Object.freeze([
  { value: 'id', label: '卡号' },
  { value: 'name', label: '卡名' },
  { value: 'effect', label: '效果' },
])

const CARD_TYPE_OPTIONS = Object.freeze(['角色卡', '事件卡', '高潮卡'])

const COLOR_OPTIONS = Object.freeze([
  { value: '黄色', label: '黄', activeClass: 'native-chip--selected text-amber-darken-3' },
  { value: '绿色', label: '绿', activeClass: 'native-chip--selected text-green-darken-1' },
  { value: '红色', label: '红', activeClass: 'native-chip--selected text-red-darken-1' },
  { value: '蓝色', label: '蓝', activeClass: 'native-chip--selected text-blue-darken-1' },
  { value: '紫色', label: '紫', activeClass: 'native-chip--selected text-purple-darken-1' },
])

const filterStore = props.globalFilter ? useGlobalSearchStore() : useFilterStore()

const allKeywords = computed(() => {
  return [...uiStore.customKeywords, ...DEFAULT_KEYWORDS]
})

const isSwitchDisabled = computed(
  () => props.disabled || (!filterStore.hasActiveFilters && props.globalFilter)
)

const isSelected = (field, value) => {
  return Boolean(filterStore[field]?.includes(value))
}

const toggleFilterItem = (field, value) => {
  if (props.disabled) return
  const current = filterStore[field] || []
  filterStore[field] = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value]
}

// Local state for sliders to prevent frequent store updates
const isDraggingPower = ref(false)
const localPower = ref(filterStore.selectedPowerRange)

const powerRangeText = computed(() => {
  const [min, max] = isDraggingPower.value ? localPower.value : filterStore.selectedPowerRange
  if (min === max) return min
  return `${min} – ${max}`
})

const onPowerStart = () => {
  localPower.value = filterStore.selectedPowerRange
  isDraggingPower.value = true
}

const onPowerEnd = () => {
  filterStore.selectedPowerRange = localPower.value
  isDraggingPower.value = false
}

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

const toggleSearchMode = () => {
  filterStore.searchMode = filterStore.searchMode === 'fuzzy' ? 'precise' : 'fuzzy'
}
</script>

<style scoped>
.v-select {
  flex: none !important;
}

.native-chip-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.native-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 9999px;
  font-size: 14px;
  line-height: 1;
  user-select: none;
  cursor: pointer;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.87);
  contain: layout paint style;
  transition:
    background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.1s ease;
  vertical-align: middle;
}

.native-chip--small {
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
}

.native-chip:hover:not(:disabled) {
  background-color: rgba(var(--v-theme-on-surface), 0.14);
}

.native-chip:active:not(:disabled) {
  transform: scale(0.96);
}

.native-chip--selected {
  background-color: color-mix(in srgb, currentColor 15%, transparent);
}

.native-chip--selected:hover:not(:disabled) {
  background-color: color-mix(in srgb, currentColor 22%, transparent);
}

.native-chip:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  pointer-events: none;
}

.native-chip:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}
</style>
