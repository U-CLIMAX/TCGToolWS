<template>
  <v-dialog
    v-model="showClientUpdateDialog"
    persistent
    no-click-animation
    max-width="420"
    z-index="9999"
  >
    <v-card class="text-center rounded-2lg pa-2">
      <v-card-text class="pt-6 pb-2">
        <v-avatar size="72" color="warning" variant="tonal">
          <v-icon icon="i-mdi:cloud-download" size="40" color="warning" />
        </v-avatar>
      </v-card-text>

      <v-card-title class="text-h6 font-weight-bold px-6 pt-2"> 发现新版本客户端 </v-card-title>

      <v-card-text class="text-body-2 px-6 py-3 text-medium-emphasis">
        检测到最新客户端版本 <strong>v{{ clientUpdateVersion }}</strong> <br />
        （当前版本：v{{ localAppVersion }}）。<br />
        建议前往更新以获得最新功能与体验。
      </v-card-text>

      <v-card-actions class="px-4 pb-4 pt-2 d-flex ga-2">
        <v-btn
          variant="text"
          color="grey"
          class="flex-1-1"
          rounded="lg"
          @click="dismissUpdateDialog"
        >
          稍后提醒
        </v-btn>
        <v-btn color="primary" variant="flat" class="flex-1-1" rounded="lg" @click="goToDownload">
          前往下载
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useClientUpdate } from '@/composables/useClientUpdate'

const {
  showClientUpdateDialog,
  clientUpdateVersion,
  localAppVersion,
  dismissUpdateDialog,
  goToDownload,
} = useClientUpdate()
</script>
