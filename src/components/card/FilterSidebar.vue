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

        <div class="d-flex flex-column ga-2">
          <label class="native-switch" :class="{ 'native-switch--disabled': isSwitchDisabled }">
            <input
              type="checkbox"
              v-model="filterStore.showUniqueCards"
              :disabled="isSwitchDisabled"
              class="native-switch__input"
            />
            <span class="native-switch__track">
              <span class="native-switch__thumb" />
            </span>
            <span class="native-switch__label">高罕过滤</span>
          </label>

          <label class="native-switch" :class="{ 'native-switch--disabled': isSwitchDisabled }">
            <input
              type="checkbox"
              v-model="filterStore.showTriggerSoul"
              :disabled="isSwitchDisabled"
              class="native-switch__input"
            />
            <span class="native-switch__track">
              <span class="native-switch__thumb" />
            </span>
            <span class="native-switch__label d-flex align-center">
              <span class="mr-1.5">魂标筛选</span>
              <img
                :src="WsIcon"
                width="15"
                height="15"
                :style="{
                  filter: theme.global.name.value === 'dark' ? 'none' : 'invert(1)',
                  opacity: 0.7,
                }"
              />
            </span>
          </label>
        </div>

        <v-divider></v-divider>

        <!-- 种类 -->
        <div>
          <div class="text-caption font-weight-light text-disabled mb-1">种类</div>
          <div class="native-chip-group">
            <button
              v-for="type in CARD_TYPE_OPTIONS"
              :key="type.value"
              type="button"
              class="native-chip font-weight-medium"
              :class="{
                'native-chip--selected text-primary': isSelected('selectedCardTypes', type.value),
              }"
              :disabled="props.disabled"
              :aria-pressed="isSelected('selectedCardTypes', type.value)"
              @click="toggleFilterItem('selectedCardTypes', type.value)"
            >
              {{ type.label }}
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

        <!-- 战斗力 -->
        <div v-if="filterStore.powers?.length">
          <div class="d-flex justify-space-between align-center mb-1">
            <div class="d-flex align-center ga-1">
              <span class="text-caption font-weight-light text-disabled">战斗力</span>
              <button
                type="button"
                class="power-toggle-btn i-mdi:swap-horizontal"
                :title="isPowerRangeMode ? '切换为按钮布局' : '切换为范围输入'"
                :disabled="props.disabled"
                @click="togglePowerMode"
              />
            </div>
            <button
              v-if="!isPowerRangeMode && filterStore.powers.length > 8"
              type="button"
              class="toggle-expand-btn text-caption text-primary font-weight-medium"
              @click="isPowerExpanded = !isPowerExpanded"
            >
              {{ isPowerExpanded ? '收起 ▴' : '展开全部▾' }}
            </button>
          </div>
          <div v-if="isPowerRangeMode" class="d-flex align-center ga-2">
            <template v-for="(limit, i) in powerLimits" :key="i">
              <span v-if="i" class="text-disabled">~</span>
              <input
                type="text"
                inputmode="numeric"
                class="power-range-input"
                :value="filterStore.powerRange[i] ?? ''"
                :placeholder="limit"
                :disabled="props.disabled"
                @change="setPowerRange(i, $event)"
              />
            </template>
          </div>
          <div v-else class="power-grid">
            <button
              v-for="p in visiblePowers"
              :key="p"
              type="button"
              class="native-chip native-chip--power font-weight-medium"
              :class="{
                'native-chip--selected text-primary': isSelected('selectedPowers', p),
              }"
              :disabled="props.disabled"
              :aria-pressed="isSelected('selectedPowers', p)"
              @click="toggleFilterItem('selectedPowers', p)"
            >
              {{ p }}
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

const CARD_TYPE_OPTIONS = Object.freeze([
  { key: '角色', value: '角色卡', label: '角色' },
  { key: '事件', value: '事件卡', label: '事件' },
  { key: '高潮', value: '高潮卡', label: '高潮' },
])

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

const isPowerRangeMode = ref(true)

const powerLimits = computed(() => {
  const p = filterStore.powers || []
  return [p[0], p.at(-1)]
})

// 失焦/Enter 时提交：夹在列表最小~最大值之间，并保证 min <= max
const setPowerRange = (i, e) => {
  const [lo, hi] = powerLimits.value
  const raw = e.target.value.trim()
  const num = raw === '' || isNaN(raw) ? null : Math.min(Math.max(Number(raw), lo), hi)
  const range = [...filterStore.powerRange]
  range[i] = num
  if (range[0] !== null && range[1] !== null && range[0] > range[1]) range[1 - i] = num
  filterStore.powerRange = range
  e.target.value = num ?? ''
}

const togglePowerMode = () => {
  filterStore.selectedPowers = []
  filterStore.powerRange = [null, null]
  isPowerRangeMode.value = !isPowerRangeMode.value
}

const isPowerExpanded = ref(false)

const visiblePowers = computed(() => {
  const all = filterStore.powers || []
  if (isPowerExpanded.value || all.length <= 8) return all
  const selected = filterStore.selectedPowers || []
  const initial = all.slice(0, 8)
  const extraSelected = selected.filter((p) => all.indexOf(p) >= 8)
  if (extraSelected.length === 0) return initial
  return [...new Set([...initial, ...extraSelected])].sort((a, b) => a - b)
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
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 9999px;
  font-size: 14px;
  line-height: 1;
  user-select: none;
  cursor: pointer;
  background-color: transparent;
  color: rgba(var(--v-theme-on-surface), 0.7);
  contain: layout paint style;
  transition:
    border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.1s ease;
  vertical-align: middle;
}

.native-chip--small {
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
}

.power-toggle-btn {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  cursor: pointer;
  transition: color 0.2s ease;
}

.power-toggle-btn:hover:not(:disabled) {
  color: rgb(var(--v-theme-primary));
}

.power-toggle-btn:disabled,
.power-range-input:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.power-range-input {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 9999px;
  color: inherit;
  font-size: 13px;
  text-align: center;
  outline: none;
}

.power-range-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.38);
}

.power-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.native-chip--power {
  height: 26px;
  padding: 0 2px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  width: 100%;
  justify-content: center;
}

.toggle-expand-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  user-select: none;
  line-height: 1;
  transition: opacity 0.2s ease;
}

.toggle-expand-btn:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.native-switch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
}

.native-switch--disabled {
  opacity: 0.38;
  cursor: not-allowed;
  pointer-events: none;
}

.native-switch__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
  pointer-events: none;
}

.native-switch__track {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 36px;
  height: 20px;
  border-radius: 9999px;
  background-color: rgba(var(--v-theme-on-surface), 0.24);
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.native-switch__thumb {
  position: absolute;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: rgb(var(--v-theme-surface));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition:
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    background-color 0.2s ease;
}

.native-switch__input:checked + .native-switch__track {
  background-color: rgb(var(--v-theme-primary));
}

.native-switch__input:checked + .native-switch__track .native-switch__thumb {
  transform: translateX(16px);
  background-color: #fff;
}

.native-switch__input:focus-visible + .native-switch__track {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.native-switch__label {
  color: rgba(var(--v-theme-on-surface), 0.87);
  line-height: 1;
}

.native-chip:hover:not(:disabled) {
  border-color: rgba(var(--v-theme-on-surface), 0.45);
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.native-chip:active:not(:disabled) {
  transform: scale(0.96);
}

.native-chip--selected,
.native-chip--selected:hover:not(:disabled) {
  border-color: currentColor;
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
