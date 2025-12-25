<template>
  <v-dialog v-model="visible" persistent no-click-animation max-width="400" z-index="9999">
    <v-card class="text-center">
      <v-card-text class="pt-8 pb-2">
        <v-avatar size="80" color="primary" variant="tonal">
          <v-icon icon="mdi-sync-circle" size="48" color="primary"></v-icon>
        </v-avatar>
      </v-card-text>

      <v-card-title class="text-h5 font-weight-bold px-6 pt-4"> 网页已更新 </v-card-title>

      <v-card-text class="text-body-1 px-6 py-4 text-medium-emphasis">
        系统已发布新版本。 <br />
        重新载入页面即可使用最新功能与修正内容。
      </v-card-text>

      <v-card-actions class="px-6 pb-6 pt-2">
        <v-btn
          color="primary"
          size="large"
          variant="flat"
          block
          @click="uiStore.confirmUpdate"
          rounded="lg"
        >
          立即重新载入
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
const visible = computed(() => uiStore.showForceUpdate)
</script>
