<template>
  <v-dialog
    v-model="showClientUpdateDialog"
    persistent
    no-click-animation
    max-width="480"
    z-index="9999"
  >
    <v-card class="rounded-2lg pa-4">
      <!-- 頂部圖標與版本標題 -->
      <div class="text-center pt-2 pb-1">
        <v-avatar
          size="56"
          :color="downloadStatus === 'error' ? 'error' : 'primary'"
          variant="tonal"
          class="mb-3"
        >
          <v-icon
            :icon="
              downloadStatus === 'error'
                ? 'i-mdi:alert-circle'
                : downloadStatus === 'installing'
                  ? 'i-mdi:progress-check'
                  : 'i-mdi:cloud-download'
            "
            size="32"
            :color="downloadStatus === 'error' ? 'error' : 'primary'"
          />
        </v-avatar>

        <h3 class="text-h6 font-weight-bold">
          {{ downloadStatus === 'error' ? '更新下载失败' : '发现新版本客户端' }}
        </h3>

        <!-- 版本標籤對比 -->
        <div class="d-flex justify-center align-center ga-2 mt-2">
          <v-chip size="small" variant="tonal" color="grey"> 当前: v{{ localAppVersion }} </v-chip>
          <v-icon icon="i-mdi:arrow-right" size="14" color="grey" />
          <v-chip size="small" variant="flat" color="green" class="font-weight-bold">
            最新: v{{ clientUpdateVersion }}
          </v-chip>
        </div>
      </div>

      <!-- 更新日誌內容卡片 -->
      <div v-if="formattedNotesHtml && downloadStatus === 'idle'" class="mt-4">
        <v-card variant="outlined" rounded="lg" class="pa-3">
          <div
            class="d-flex align-center ga-1 text-caption font-weight-bold text-medium-emphasis mb-2"
          >
            <v-icon icon="i-mdi:text-box-outline" size="16" color="primary" />
            <span>更新日志</span>
          </div>

          <v-sheet
            class="themed-scrollbar text-body-2 text-high-emphasis pr-1 markdown-body"
            max-height="180"
            style="overflow-y: auto"
            color="transparent"
          >
            <div v-html="formattedNotesHtml"></div>
          </v-sheet>
        </v-card>
      </div>

      <!-- 下载进度条與狀態展示 -->
      <div
        v-if="downloadStatus === 'downloading' || downloadStatus === 'installing'"
        class="mt-4 px-1"
      >
        <div class="d-flex justify-space-between text-caption text-medium-emphasis mb-1">
          <span>
            {{ downloadStatus === 'installing' ? '正在启动安装程序...' : '正在下载更新包...' }}
          </span>
          <span class="font-weight-bold text-primary">{{ downloadProgress.toFixed(1) }}%</span>
        </div>

        <v-progress-linear
          :model-value="downloadProgress"
          color="primary"
          height="8"
          rounded
          striped
          :indeterminate="
            downloadStatus === 'installing' || (downloadProgress === 0 && isDownloading)
          "
        />

        <div class="d-flex justify-space-between text-caption text-disabled mt-2">
          <span>{{ downloadedSize }} / {{ totalSize || '未知大小' }}</span>
          <span v-if="downloadSpeed">{{ downloadSpeed }}</span>
        </div>
      </div>

      <!-- 錯誤提示 -->
      <div v-if="downloadStatus === 'error'" class="mt-3">
        <v-alert
          type="error"
          variant="tonal"
          density="compact"
          class="text-caption"
          rounded="lg"
          :text="downloadError || '网络连接异常，请重试或前往浏览器下载。'"
        />
      </div>

      <!-- 按鈕操作區 -->
      <v-card-actions class="px-0 pb-0 pt-4 d-flex ga-2">
        <!-- 初始檢測狀態 -->
        <template v-if="downloadStatus === 'idle'">
          <v-btn
            variant="tonal"
            color="grey"
            class="flex-1-1"
            rounded="lg"
            @click="dismissUpdateDialog"
          >
            稍后提醒
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="flex-1-1"
            rounded="lg"
            @click="startDownloadAndInstall"
          >
            立即在线更新
          </v-btn>
        </template>

        <!-- 下載進行中 -->
        <template v-else-if="downloadStatus === 'downloading'">
          <v-btn
            variant="tonal"
            color="error"
            class="flex-1-1"
            rounded="lg"
            @click="cancelDownload"
          >
            取消下载
          </v-btn>
        </template>

        <!-- 安裝中狀態 -->
        <template v-else-if="downloadStatus === 'installing'">
          <v-btn variant="flat" color="primary" class="flex-1-1" rounded="lg" disabled loading>
            正在启动安装...
          </v-btn>
        </template>

        <!-- 失敗狀態 -->
        <template v-else-if="downloadStatus === 'error'">
          <v-btn variant="tonal" color="grey" class="flex-1-1" rounded="lg" @click="goToDownload">
            浏览器手动下载
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="flex-1-1"
            rounded="lg"
            @click="startDownloadAndInstall"
          >
            重试在线更新
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import { useClientUpdate } from '@/composables/useClientUpdate'

const {
  showClientUpdateDialog,
  clientUpdateVersion,
  localAppVersion,
  updateNotes,
  isDownloading,
  downloadProgress,
  downloadSpeed,
  downloadedSize,
  totalSize,
  downloadStatus,
  downloadError,
  startDownloadAndInstall,
  cancelDownload,
  dismissUpdateDialog,
  goToDownload,
} = useClientUpdate()

const formattedNotesHtml = computed(() => {
  if (!updateNotes.value) return ''
  try {
    return marked.parse(updateNotes.value, {
      gfm: true,
      breaks: true,
    })
  } catch (e) {
    console.error('Failed to parse markdown notes:', e)
    return updateNotes.value
  }
})
</script>

<style scoped>
.markdown-body :deep(ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-top: 0.25rem;
  margin-bottom: 0.4rem;
}
.markdown-body :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin-top: 0.25rem;
  margin-bottom: 0.4rem;
}
.markdown-body :deep(li) {
  margin-bottom: 0.25rem;
  line-height: 1.5;
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  font-weight: 700;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}
.markdown-body :deep(h3) {
  font-size: 0.95rem;
  color: rgb(var(--v-theme-primary));
}
.markdown-body :deep(p) {
  margin-bottom: 0.4rem;
}
.markdown-body :deep(code) {
  font-size: 0.85em;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
}
</style>
