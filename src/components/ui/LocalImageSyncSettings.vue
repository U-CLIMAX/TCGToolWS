<template>
  <v-divider />

  <v-list-item>
    <v-list-item-title class="d-flex align-center">
      卡图来源
      <v-tooltip
        text="选择使用官方 CDN 在线加载，或自动同步本地卡图以离线加载"
        location="top"
        open-on-click
      >
        <template #activator="{ props: tooltipProps }">
          <v-icon
            v-bind="tooltipProps"
            icon="i-mdi:help-circle-outline"
            size="x-small"
            class="ml-1"
          />
        </template>
      </v-tooltip>
    </v-list-item-title>
  </v-list-item>
  <div class="px-4 pb-2">
    <v-btn-toggle
      v-model="uiStore.imageSource"
      color="primary"
      group
      mandatory
      variant="outlined"
      class="w-100 rounded-lg"
    >
      <v-btn value="remote" class="flex-grow-1">
        <span class="text-caption">在线加载</span>
        <v-icon end icon="i-mdi:cloud-outline" />
      </v-btn>
      <v-btn value="local" class="flex-grow-1">
        <span class="text-caption">本地卡图</span>
        <v-icon end icon="i-mdi:folder-image" />
      </v-btn>
    </v-btn-toggle>

    <div v-if="uiStore.imageSource === 'local'" class="mt-3">
      <!-- Sync Summary & Status -->
      <div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-2">
        <div class="text-caption">
          <template v-if="syncStatus === 'checking'">
            <span class="d-flex align-center text-medium-emphasis">
              <v-progress-circular indeterminate size="12" width="2" color="primary" class="mr-1" />
              正在检查卡图状态...
            </span>
          </template>
          <template v-else-if="isAllUpToDate">
            <span class="text-success font-weight-medium">
              <v-icon icon="i-mdi:check-circle" size="small" class="mr-1" />
              本地卡图已是最新 (占用 {{ formatBytes(syncSummary.occupiedSize) }})
            </span>
          </template>
          <template v-else-if="syncSummary.totalManifestPackages > 0">
            <span>
              已就绪 <b>{{ formatBytes(syncSummary.occupiedSize) }}</b>
              <template v-if="syncSummary.totalSizeToDownload > 0">
                / 待同步 <b>{{ formatBytes(syncSummary.totalSizeToDownload) }}</b>
              </template>
            </span>
          </template>
          <template v-else>
            <span class="text-medium-emphasis">点击检查卡图状态</span>
          </template>
        </div>

        <v-btn
          v-if="!isSyncing"
          variant="text"
          density="compact"
          size="small"
          prepend-icon="i-mdi:refresh"
          :loading="syncStatus === 'checking'"
          @click="checkSyncStatus"
        >
          检查
        </v-btn>
      </div>

      <!-- Sync Progress (When Syncing) -->
      <div v-if="isSyncing" class="my-2">
        <div class="d-flex align-center justify-space-between text-caption mb-1">
          <span class="font-weight-medium"> 正在同步卡图... {{ syncProgress.toFixed(1) }}% </span>
          <span v-if="syncSpeed" class="text-caption text-primary ml-2 font-weight-bold">
            {{ syncSpeed }}
          </span>
        </div>

        <v-progress-linear
          :model-value="syncProgress"
          color="primary"
          height="6"
          rounded
          class="mb-1"
        />

        <div class="d-flex justify-space-between text-caption text-medium-emphasis">
          <span>
            {{ formatBytes(downloadedBytes) }} /
            {{ formatBytes(totalBytesToDownload) }}
          </span>
          <span v-if="syncSummary.occupiedSize > 0">
            占用空间: {{ formatBytes(syncSummary.occupiedSize + downloadedBytes) }}
          </span>
        </div>
      </div>

      <!-- Error Alert -->
      <v-alert
        v-if="syncError"
        type="error"
        variant="tonal"
        density="compact"
        class="my-2 text-caption"
      >
        {{ syncError }}
      </v-alert>

      <!-- Action Button -->
      <div class="mt-2">
        <v-btn
          v-if="!isSyncing && hasPendingSync"
          color="primary"
          block
          prepend-icon="i-mdi:cloud-download"
          class="rounded-lg"
          @click="startAutoSync"
        >
          {{ syncError ? '重试同步' : '自动同步' }} (约
          {{ formatBytes(syncSummary.totalSizeToDownload) }})
        </v-btn>
        <v-btn
          v-else-if="!isSyncing && isAllUpToDate"
          variant="tonal"
          color="success"
          block
          prepend-icon="i-mdi:check"
          class="rounded-lg"
          disabled
        >
          卡图已全部同步完成
        </v-btn>
        <v-btn
          v-else-if="!isSyncing"
          color="primary"
          variant="tonal"
          block
          prepend-icon="i-mdi:refresh"
          class="rounded-lg"
          :loading="syncStatus === 'checking'"
          @click="checkSyncStatus"
        >
          检查并同步卡图
        </v-btn>
        <v-btn
          v-else
          color="error"
          variant="tonal"
          block
          prepend-icon="i-mdi:close-circle"
          class="rounded-lg"
          :loading="syncStatus === 'cancelling'"
          :disabled="syncStatus === 'cancelling'"
          @click="cancelSync"
        >
          {{ syncStatus === 'cancelling' ? '正在取消...' : '取消同步' }}
        </v-btn>

        <v-btn
          v-if="!isSyncing && syncSummary.occupiedSize > 0"
          color="error"
          variant="text"
          block
          size="small"
          prepend-icon="i-mdi:trash-can-outline"
          class="rounded-lg mt-2 text-caption"
          :loading="isDeletingImages"
          @click="isConfirmDeleteOpen = true"
        >
          清除本地卡图资料库 ({{ formatBytes(syncSummary.occupiedSize) }})
        </v-btn>
      </div>
    </div>
  </div>

  <!-- Confirm Delete Local Images Dialog -->
  <v-dialog v-model="isConfirmDeleteOpen" max-width="400px" persistent>
    <v-card class="rounded-xl">
      <v-card-title class="d-flex align-center pt-4 px-4 text-h6">
        <v-icon icon="i-mdi:alert-circle-outline" color="error" class="mr-2" />
        删除本地卡图资料库
      </v-card-title>
      <v-card-text class="px-4 py-2 text-body-2 text-medium-emphasis">
        确定要删除本地卡图资料库吗？此操作将清空所有已下载的本地卡片图片（当前占用
        {{ formatBytes(syncSummary.occupiedSize) }}）。删除后如需离线浏览，可随时重新同步。
      </v-card-text>
      <v-card-actions class="px-4 pb-4 pt-2">
        <v-spacer />
        <v-btn
          variant="text"
          class="rounded-lg"
          :disabled="isDeletingImages"
          @click="isConfirmDeleteOpen = false"
        >
          取消
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          class="rounded-lg"
          :loading="isDeletingImages"
          @click="handleDeleteLocalImages"
        >
          确认删除
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useCardImageSync, formatBytes } from '@/composables/useCardImageSync'
import { useSnackbar } from '@/composables/useSnackbar'

const uiStore = useUIStore()
const { triggerSnackbar } = useSnackbar()

const {
  isSyncing,
  syncStatus,
  syncProgress,
  downloadedBytes,
  totalBytesToDownload,
  syncSpeed,
  syncError,
  syncSummary,
  hasPendingSync,
  isAllUpToDate,
  resolveDefaultImageDir,
  checkSyncStatus,
  startAutoSync,
  cancelSync,
  deleteLocalCardImages,
} = useCardImageSync()

const isConfirmDeleteOpen = ref(false)
const isDeletingImages = ref(false)

onMounted(async () => {
  await resolveDefaultImageDir()
  await checkSyncStatus()
})

const handleDeleteLocalImages = async () => {
  isDeletingImages.value = true
  try {
    await deleteLocalCardImages()
    isConfirmDeleteOpen.value = false
    triggerSnackbar('已成功删除本地卡图资料库', 'success')
  } catch (err) {
    triggerSnackbar(`删除失败: ${err.message || err}`, 'error')
  } finally {
    isDeletingImages.value = false
  }
}
</script>
