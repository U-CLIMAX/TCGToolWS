<template>
  <v-dialog v-model="dialog" max-width="900px" scrollable :fullscreen="smAndDown">
    <v-card>
      <v-toolbar color="primary" density="compact">
        <v-toolbar-title>发布商品</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" @click="dialog = false"></v-btn>
      </v-toolbar>

      <v-card-text class="pa-4 themed-scrollbar">
        <v-form ref="form" v-model="isValid">
          <v-container>
            <v-row dense>
              <!-- 1. 基本資訊 -->
              <v-col cols="12" md="6">
                <v-autocomplete
                  v-model="formData.seriesId"
                  :items="seriesOptions"
                  item-title="title"
                  item-value="value"
                  label="系列 *"
                  :rules="[(v) => !!v || '请选择系列']"
                  variant="outlined"
                  density="comfortable"
                  @update:model-value="onSeriesChange"
                  :menu-props="uiStore.menuProps"
                ></v-autocomplete>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="formData.price"
                  label="价格 (CNY) *"
                  type="number"
                  :rules="[
                    (v) => (v !== null && v !== undefined && v !== '') || '请输入价格',
                    (v) => v >= 0 || '价格不能为负数',
                  ]"
                  variant="outlined"
                  density="comfortable"
                  prefix="¥"
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.climaxTypes"
                  :items="marketStore.climaxTypeOptions"
                  item-title="name"
                  item-value="value"
                  label="潮种类 (多选) *"
                  :rules="[(v) => v.length > 0 || '请至少选择一种潮种类']"
                  multiple
                  chips
                  variant="outlined"
                  density="comfortable"
                  :menu-props="uiStore.menuProps"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props" :title="item.raw.name">
                      <template #prepend>
                        <v-img :src="item.raw.icon" width="24" height="24" class="mr-2" contain />
                      </template>
                    </v-list-item>
                  </template>
                  <template #chip="{ item }">
                    <v-chip class="ma-1" size="small">
                      <template #prepend>
                        <v-img :src="item.raw.icon" width="16" height="16" class="mr-1" />
                      </template>
                      {{ item.raw.name }}
                    </v-chip>
                  </template>
                </v-select>
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.tags"
                  :items="marketStore.tagOptions"
                  item-title="label"
                  item-value="value"
                  label="标签"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  density="comfortable"
                  placeholder="选择标签"
                  :menu-props="uiStore.menuProps"
                ></v-select>
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="formData.shopUrl"
                  label="卖场链接 (闲鱼/淘宝等) *"
                  :rules="[
                    (v) => !!v || '请输入链接',
                    (v) => /^https:\/\//.test(v) || '链接必须以 https:// 开头',
                  ]"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-link"
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.deckCode"
                  label="U-CLIMAX 卡组代码"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-code-json"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-divider class="my-4"></v-divider>

            <!-- 2. 封面選擇區域 -->
            <div class="text-subtitle-1 font-weight-bold mb-2">选择联动卡片 (最多3张) *</div>
            <div class="text-caption text-grey mb-3">仅显示该系列的联动角色卡 (已過濾高罕)。</div>

            <div v-if="isLoadingCards" class="d-flex justify-center pa-4">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <div v-else-if="availableCoverCards.length > 0">
              <v-sheet
                class="overflow-y-auto pa-2 rounded themed-scrollbar border"
                max-height="400px"
                color="transparent"
              >
                <v-row dense>
                  <v-col v-for="card in availableCoverCards" :key="card.id" cols="4" sm="3" md="2">
                    <div
                      class="cover-selection-item position-relative"
                      :class="{ selected: formData.selectedCardIds.includes(card.id) }"
                      @click="toggleCardSelection(card)"
                    >
                      <v-img
                        :src="getCardImage(card).base"
                        :lazy-src="getCardImage(card).blur"
                        aspect-ratio="0.716"
                        cover
                        class="rounded"
                      ></v-img>

                      <!-- Selection Overlay -->
                      <div
                        v-if="formData.selectedCardIds.includes(card.id)"
                        class="selection-overlay d-flex align-center justify-center"
                      >
                        <v-icon color="white" size="32">mdi-check-circle</v-icon>
                      </div>
                    </div>
                  </v-col>
                </v-row>
              </v-sheet>
              <div class="text-right mt-2 text-caption">
                已选择 {{ formData.selectedCardIds.length }} / 3
              </div>
            </div>

            <div v-else-if="formData.seriesId" class="text-center pa-4 text-grey">
              没有找到符合条件的卡片
            </div>
            <div v-else class="text-center pa-4 text-grey">请先选择系列</div>

            <v-alert
              v-if="errorMsg"
              type="error"
              density="compact"
              class="mt-4"
              closable
              @click:close="errorMsg = ''"
            >
              {{ errorMsg }}
            </v-alert>
          </v-container>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4 mt-3 pt-0">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="dialog = false">取消</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="handleSubmit"
          :loading="isSubmitting"
          :disabled="!isValid || formData.selectedCardIds.length === 0"
        >
          发布
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useDisplay } from 'vuetify'
import { seriesMap } from '@/maps/series-map'
import { useFilterStore } from '@/stores/filter'
import { useMarketStore } from '@/stores/market'
import { useUIStore } from '@/stores/ui'
import { useCardImage } from '@/composables/useCardImage'
import { useSnackbar } from '@/composables/useSnackbar'

const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue', 'created'])
const { smAndDown } = useDisplay()
const filterStore = useFilterStore()
const marketStore = useMarketStore()
const uiStore = useUIStore()
const { triggerSnackbar } = useSnackbar()

const dialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const form = ref(null)
const isValid = ref(false)
const isSubmitting = ref(false)
const isLoadingCards = ref(false)
const errorMsg = ref('')

const formData = reactive({
  seriesId: null,
  price: null,
  climaxTypes: [],
  tags: [],
  shopUrl: '',
  deckCode: '',
  selectedCardIds: [],
})

const availableCoverCards = ref([])

const seriesOptions = computed(() => {
  return Object.keys(seriesMap)
    .map((key) => ({
      title: key,
      value: seriesMap[key].id,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
})

const onSeriesChange = async () => {
  formData.selectedCardIds = []
  availableCoverCards.value = []

  if (!formData.seriesId) return

  isLoadingCards.value = true
  try {
    const seriesEntry = Object.entries(seriesMap).find(([, val]) => val.id === formData.seriesId)
    if (!seriesEntry) throw new Error('系列未找到')

    const prefixes = seriesEntry[1].prefixes
    const { allCards } = await filterStore.fetchAndProcessCards(prefixes)
    const climaxCards = allCards.filter((c) => c.type === '高潮卡')
    const validComboIds = new Set()

    climaxCards.forEach((c) => {
      if (c.link && Array.isArray(c.link)) {
        c.link.forEach((linkId) => {
          validComboIds.add(linkId)
        })
      }
    })

    // 4. Filter Cards
    availableCoverCards.value = allCards.filter((c) => {
      if (!c.isLowestRarity) return false
      const isComboChar = validComboIds.has(c.id)

      return isComboChar
    })
  } catch (err) {
    console.error(err)
    triggerSnackbar('加载卡片失败', 'error')
  } finally {
    isLoadingCards.value = false
  }
}

const getCardImage = (card) => {
  const { base, blur } = useCardImage(card.cardIdPrefix, card.id)
  return { base: base.value, blur: blur.value }
}

const toggleCardSelection = (card) => {
  const index = formData.selectedCardIds.indexOf(card.id)
  if (index >= 0) {
    formData.selectedCardIds.splice(index, 1)
  } else {
    if (formData.selectedCardIds.length >= 3) {
      triggerSnackbar('最多只能选择 3 张封面', 'warning')
      return
    }
    formData.selectedCardIds.push(card.id)
  }
}

const handleSubmit = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return
  if (formData.selectedCardIds.length === 0) {
    triggerSnackbar('请选择至少一张封面卡片', 'warning')
    return
  }

  isSubmitting.value = true
  errorMsg.value = ''

  try {
    const selectedCardsData = formData.selectedCardIds.map((id) => {
      const card = availableCoverCards.value.find((c) => c.id === id)
      return {
        id: card.id,
        cardIdPrefix: card.cardIdPrefix,
      }
    })

    await marketStore.createListing({
      series_name: formData.seriesId,
      cards_id: selectedCardsData, // Array of objects {id, cardIdPrefix}
      climax_types: formData.climaxTypes, // Array
      tags: formData.tags, // Array
      price: formData.price,
      shop_url: formData.shopUrl,
      deck_code: formData.deckCode,
    })

    triggerSnackbar('发布成功！', 'success')
    emit('created')
    dialog.value = false

    // Reset form
    formData.seriesId = null
    formData.price = null
    formData.climaxTypes = []
    formData.tags = []
    formData.shopUrl = ''
    formData.deckCode = ''
    formData.selectedCardIds = []
    availableCoverCards.value = []
  } catch (err) {
    console.error(err)
    errorMsg.value = err.message || '发布失败'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.cover-selection-item {
  cursor: pointer;
  transition: transform 0.2s;
  border: 2px solid transparent;
  border-radius: 4px;
}

.cover-selection-item:hover {
  transform: scale(1.02);
}

.cover-selection-item.selected {
  border-color: rgb(var(--v-theme-primary));
}

.selection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
}
</style>
