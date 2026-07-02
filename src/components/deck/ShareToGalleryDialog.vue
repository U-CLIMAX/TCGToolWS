<template>
  <v-dialog
    :model-value="modelValue"
    max-width="450"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-2lg pa-2">
      <template #prepend>
        <v-icon color="primary" :icon="isEdit ? 'i-mdi:pencil' : 'i-mdi:view-grid-plus'" />
        <v-card-title class="pl-2">{{ isEdit ? '编辑分享信息' : '分享到卡组广场' }}</v-card-title>
      </template>

      <v-card-text class="pb-2">
        <v-text-field
          v-model="localForm.deckName"
          label="卡组名称"
          variant="outlined"
          density="compact"
          class="mb-4"
          :rules="[deckNameRule]"
          hide-details="auto"
        ></v-text-field>

        <v-text-field
          v-model="localForm.articleLink"
          label="Bilibili文章/视频 (可选)"
          placeholder="https://www.bilibili.com/..."
          variant="outlined"
          density="compact"
          class="mb-4"
          :rules="[articleLinkRule]"
          clearable
          prepend-inner-icon="i-mdi:link-variant"
          hide-details="auto"
        ></v-text-field>

        <v-switch
          v-model="localForm.includeTournamentInfo"
          label="添加比赛信息 (如店赛、WGP等)"
          color="primary"
          density="compact"
          inset
          class="mb-2"
        ></v-switch>

        <v-expand-transition>
          <div v-if="localForm.includeTournamentInfo">
            <v-select
              v-model="localForm.tournamentType"
              :items="tournamentTypeOptions"
              label="比赛类型"
              variant="outlined"
              density="compact"
              class="mb-4"
              hide-details
            ></v-select>

            <v-select
              v-model="localForm.participantCount"
              :items="participantCountOptions"
              label="参赛人数"
              variant="outlined"
              density="compact"
              class="mb-4"
              hide-details
            ></v-select>

            <v-select
              v-model="localForm.placement"
              :items="placementOptions"
              label="获得名次"
              variant="outlined"
              density="compact"
              hide-details
            ></v-select>
          </div>
        </v-expand-transition>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text="取消" @click="$emit('update:modelValue', false)"></v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          :text="isEdit ? '确认修改' : '确认分享'"
          @click="handleConfirm"
          :disabled="!localForm.deckName.trim() || !isFormValid || !isFormChanged"
        ></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, reactive, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useSnackbar } from '@/composables/useSnackbar'
import { hasSensitiveWords } from '@/utils/sensitiveWords'

const props = defineProps({
  modelValue: Boolean,
  form: {
    type: Object,
    required: true,
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const { triggerSnackbar } = useSnackbar()
const route = useRoute()

const localForm = reactive({
  deckName: '',
  articleLink: '',
  includeTournamentInfo: false,
  tournamentType: 'shop',
  participantCount: 'under10',
  placement: 'champion',
})

const initialFormSnapshot = ref('')

onMounted(() => {
  Object.assign(localForm, props.form)
  initialFormSnapshot.value = JSON.stringify(localForm)
})

const isFormChanged = computed(() => {
  if (route.name == 'DeckDetail') return true
  return JSON.stringify(localForm) !== initialFormSnapshot.value
})

const tournamentTypeOptions = [
  { title: '店赛', value: 'shop' },
  { title: '巡回赛', value: 'circuit' },
  { title: 'WGP', value: 'wgp' },
  { title: 'BCF', value: 'bcf' },
]

const participantCountOptions = [
  { title: '10人以下', value: 'under10' },
  { title: '10-20人', value: '10to20' },
  { title: '20-30人', value: '20to30' },
  { title: '30人以上', value: 'over30' },
]

const placementOptions = computed(() => {
  const base = [
    { title: '冠军', value: 'champion' },
    { title: '亚军', value: 'runner_up' },
    { title: '四强', value: 'top4' },
  ]
  if (['circuit', 'wgp', 'bcf'].includes(localForm.tournamentType)) {
    return [...base, { title: '八强', value: 'top8' }, { title: '十六强', value: 'top16' }]
  }
  return base
})

const deckNameRule = (v) => {
  if (v.length > 20) return '卡组名称不能超过20个字'
  return true
}

const articleLinkRule = (v) => {
  if (!v) return true
  return v.startsWith('https://www.bilibili.com/') || '必须包含 https://www.bilibili.com/'
}

const isFormValid = computed(() => {
  return (
    deckNameRule(localForm.deckName) === true && articleLinkRule(localForm.articleLink) === true
  )
})

const handleConfirm = async () => {
  if (await hasSensitiveWords(localForm.deckName)) {
    triggerSnackbar('检测到敏感词！', 'error')
    return
  }
  emit('confirm', { ...localForm })
}
</script>
