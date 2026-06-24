<template>
  <v-hover v-slot="{ isHovering, props }">
    <div v-bind="props" class="position-relative">
      <v-card
        :to="{ name: 'DeckDetail', params: { key: deckKey } }"
        variant="flat"
        rounded="3md"
        class="deck-card"
        :class="{ 'is-lifted': isHovering && !isTouch }"
      >
        <v-img
          :src="imageUrl"
          class="align-end preload-img"
          style="transform: scale(1.1)"
          aspect-ratio="1"
          cover
          position="top"
          :lazy-src="blurUrl"
        >
          <template #error>
            <v-img src="/placehold.webp" aspect-ratio="1" cover />
          </template>

          <div
            v-if="imageUrl"
            class="action-background"
            :class="{ 'action-background-visible': isHovering || isTouch }"
          ></div>
          <div :class="{ 'title-background': !isEditing, 'full-mask': isEditing }"></div>
          <div v-if="isEditing" class="editing-text">编辑中</div>
          <v-card-text class="deck-title" style="z-index: 1">
            <div v-if="deck.tags && deck.tags.length > 0" class="d-flex flex-wrap ga-1 mb-1">
              <v-chip
                v-for="tag in deck.tags"
                :key="tag"
                :size="smAndDown ? 'x-small' : 'small'"
                color="primary"
                variant="elevated"
                density="compact"
              >
                {{ tag }}
              </v-chip>
            </div>
            {{ deck.name }}
          </v-card-text>
        </v-img>
      </v-card>

      <v-scale-transition>
        <div v-show="(isHovering || isTouch) && imageUrl" class="action-btn-container">
          <v-btn
            v-if="!isLocalDeck"
            :variant="isTouch ? 'text' : 'tonal'"
            icon
            density="compact"
            :size="smAndDown ? 'x-small' : 'large'"
            class="mr-2"
            @click.prevent="handleEditTags"
          >
            <v-icon color="teal-accent-3" icon="i-mdi:tag-edit" />
          </v-btn>
          <v-btn
            icon
            :variant="isTouch ? 'text' : 'tonal'"
            density="compact"
            :size="smAndDown ? 'x-small' : 'large'"
            @click.prevent="handleDeleteDeck"
          >
            <v-icon color="red-accent-3" icon="i-mdi:trash-can-outline" />
          </v-btn>
        </div>
      </v-scale-transition>

      <v-dialog v-model="isDeleteDialogOpen" max-width="400">
        <v-card class="rounded-2lg pa-2">
          <v-card-title>删除卡组</v-card-title>
          <v-card-text class="text-body-2 text-medium-emphasis"
            >确定要删除卡组 "{{ deck.name }}" 吗？此操作无法撤销。
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text="取消" @click="isDeleteDialogOpen = false"></v-btn>
            <v-btn
              color="pink-accent-3"
              variant="tonal"
              text="删除"
              @click="confirmDeleteDeck"
            ></v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="isTagsDialogOpen" max-width="450">
        <v-card class="rounded-2lg pa-3">
          <v-card-title class="d-flex align-center">
            <v-icon icon="i-mdi:tag-multiple" class="mr-2" color="primary" />
            编辑卡组标签
          </v-card-title>
          <v-card-text class="pt-2">
            <div class="text-caption text-medium-emphasis mb-3">
              输入标签名称按回车添加，或从已有标签中选择。
            </div>
            <v-combobox
              v-model="editTags"
              :items="allExistingTags"
              label="卡组标签"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="comfortable"
              placeholder="添加标签"
              :rules="[
                (v) => !v || v.length <= 2 || '最多只能选择 2 个标签',
                (v) => !v || v.every((tag) => tag.length <= 5) || '每个标签最多 5 个字',
              ]"
              hide-details="auto"
              :menu-props="uiStore.menuPropsNoGlass"
            />
          </v-card-text>
          <v-card-actions class="px-6 pb-2">
            <v-spacer />
            <v-btn variant="text" @click="isTagsDialogOpen = false">取消</v-btn>
            <v-btn
              color="primary"
              variant="tonal"
              :loading="isSavingTags"
              :disabled="
                editTags && (editTags.length > 2 || editTags.some((tag) => tag.length > 5))
              "
              @click="saveTags"
            >
              保存
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </v-hover>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { getCardUrls } from '@/utils/getCardImage'
import { useDeckStore } from '@/stores/deck'
import { useDevice } from '@/composables/useDevice'
import { useUIStore } from '@/stores/ui'
import { useSnackbar } from '@/composables/useSnackbar'

const props = defineProps({
  deck: {
    type: Object,
    required: true,
  },
  deckKey: {
    type: String,
    required: true,
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
})

const deckStore = useDeckStore()
const { isTouch } = useDevice()
const { smAndDown } = useDisplay()
const uiStore = useUIStore()
const { triggerSnackbar } = useSnackbar()

const isDeleteDialogOpen = ref(false)

const { base: imageUrl, blur: blurUrl } = getCardUrls(
  props.deck.coverCardId.cardIdPrefix,
  props.deck.coverCardId.id
)

const isLocalDeck = computed(() => props.deckKey === 'local')

const handleDeleteDeck = () => {
  isDeleteDialogOpen.value = true
}

const confirmDeleteDeck = async () => {
  uiStore.setLoading(true)

  try {
    if (isLocalDeck.value) {
      deckStore.clearDeck()
    } else {
      await deckStore.deleteDeck(props.deckKey)
    }
    isDeleteDialogOpen.value = false
  } catch (error) {
    triggerSnackbar(error.message, 'error')
  } finally {
    uiStore.setLoading(false)
  }
}

const isTagsDialogOpen = ref(false)
const editTags = ref([])
const isSavingTags = ref(false)

const allExistingTags = computed(() => {
  const tagsSet = new Set()
  Object.values(deckStore.savedDecks).forEach((d) => {
    if (d.tags && Array.isArray(d.tags)) {
      d.tags.forEach((tag) => tagsSet.add(tag))
    }
  })
  return Array.from(tagsSet).sort()
})

const handleEditTags = () => {
  editTags.value = [...(props.deck.tags || [])]
  isTagsDialogOpen.value = true
}

const saveTags = async () => {
  isSavingTags.value = true
  try {
    await deckStore.updateDeckTags(props.deckKey, editTags.value)
    isTagsDialogOpen.value = false
    triggerSnackbar('标签更新成功！', 'success')
  } catch (error) {
    triggerSnackbar(error.message, 'error')
  } finally {
    isSavingTags.value = false
  }
}
</script>

<style scoped>
.deck-card {
  transition: transform 0.2s ease-in-out;
  overflow: hidden;
}

.deck-card.is-lifted {
  transform: translateY(-6px);
}

.action-btn-container {
  position: absolute;
  top: -2px;
  right: 4px;
  z-index: 2;
}

.action-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.75) 0%, transparent 100%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  z-index: 1;
}

.action-background-visible {
  opacity: 1;
}

.deck-title {
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: clamp(0.6rem, 1vw, 1.1rem) !important;
  line-height: 1.3;
  color: white;
}

.title-background {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 20%, transparent 100%);
  pointer-events: none;
}

.full-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  pointer-events: none;
}

.editing-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  font-size: clamp(1rem, 3vw, 1.5rem);
  font-weight: bold;
  white-space: nowrap;
  background: var(--rainbow-gradirnt-dark);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-loop 3s linear infinite;
}

@media (max-width: 599.98px) {
  .deck-title {
    padding-left: clamp(8px, 2.5vw, 16px);
    padding-bottom: clamp(8px, 2.5vw, 16px);
  }
}

@media (min-width: 600px) and (max-width: 799.98px) {
  .deck-title {
    padding-left: clamp(8px, 1.5vw, 12px);
    padding-bottom: clamp(8px, 1.5vw, 12px);
  }
}

@media (min-width: 800px) and (max-width: 959.98px) {
  .deck-title {
    padding-left: clamp(12px, 2vw, 16px);
    padding-bottom: clamp(12px, 2vw, 16px);
  }
}
</style>
