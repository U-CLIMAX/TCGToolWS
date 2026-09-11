<template>
  <v-dialog
    v-model="showUpdatePromptModal"
    persistent
    no-click-animation
    max-width="440"
    z-index="9998"
  >
    <v-card class="rounded-2lg pa-4">
      <div class="text-center pt-2 pb-1">
        <v-avatar size="56" color="primary" variant="tonal" class="mb-3">
          <v-icon icon="i-mdi:folder-image" size="32" color="primary" />
        </v-avatar>

        <h3 class="text-h6 font-weight-bold">发现卡图更新</h3>

        <div class="text-body-1 text-high-emphasis mt-3">
          发现 {{ pendingPackageCount }} 个新卡图包，共约 {{ pendingTotalSize }}
        </div>

        <div class="text-caption text-medium-emphasis mt-2 px-2">
          下载将在背景进行，您也可以随时至「设定」手动更新卡图。
        </div>
      </div>

      <v-card-actions class="px-0 pb-0 pt-4 d-flex ga-2">
        <v-btn
          variant="tonal"
          color="grey"
          class="flex-1-1"
          rounded="lg"
          @click="dismissPromptThisSession"
        >
          稍后再说
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="flex-1-1"
          rounded="lg"
          @click="confirmPromptAndSync"
        >
          立即背景下载
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useCardImageSync, formatBytes } from '@/composables/useCardImageSync'

const { showUpdatePromptModal, syncSummary, dismissPromptThisSession, confirmPromptAndSync } =
  useCardImageSync()

const pendingPackageCount = computed(() => {
  return (syncSummary.value.missing || 0) + (syncSummary.value.outdated || 0)
})

const pendingTotalSize = computed(() => {
  return formatBytes(syncSummary.value.totalSizeToDownload || 0)
})
</script>
