<template>
  <v-dialog v-model="model" max-width="500" scrollable>
    <v-card class="sponsor-modal-card">
      <!-- Header (Top-right X removed; cancel/close is unified in footer actions) -->
      <v-card-title class="d-flex align-center px-5 py-4 sponsor-modal-header">
        <v-icon icon="i-mdi:lightning-bolt-circle" size="36" color="warning" class="mr-3" />
        <span class="text-h6 font-weight-bold text-high-emphasis">充電须知</span>
      </v-card-title>

      <v-divider class="sponsor-divider" />

      <!-- Body (Scrollable container without artificial max-height clipping) -->
      <v-card-text class="sponsor-modal-body px-6 py-5 d-flex flex-column ga-4 themed-scrollbar">
        <!-- 专属链接使用说明 -->
        <div class="pa-4 rounded-xl bg-surface border">
          <div class="d-flex align-center text-subtitle-2 font-weight-bold text-high-emphasis mb-1">
            <v-icon icon="i-mdi:shield-alert" color="warning" size="20" class="mr-2" />
            专属链接使用说明
          </div>
          <p class="text-caption text-medium-emphasis mb-0" style="line-height: 1.5">
            充电链接包含您的专属身份标识。请使用系统生成的专属链接进行充电。<br />
            <span class="font-weight-bold text-error">切勿使用</span
            >浏览器的“历史记录”、“书签”或“他人转发的链接”，否则系统将无法自动开通您的权限。
          </p>
        </div>

        <!-- 专属链接展示区 (生成后显示) -->
        <div v-if="generatedUrl" class="pa-4 rounded-xl bg-surface border d-flex flex-column ga-2">
          <div class="d-flex align-center text-subtitle-2 font-weight-bold text-high-emphasis">
            <v-icon icon="i-mdi:check-circle" color="success" size="20" class="mr-2" />
            您的专属充电链接
          </div>
          <div class="d-flex align-center ga-2">
            <v-text-field
              :model-value="generatedUrl"
              readonly
              density="compact"
              variant="outlined"
              hide-details
              rounded="pill"
              class="flex-grow-1 text-caption font-mono"
            />
            <v-btn
              color="primary"
              variant="flat"
              rounded="pill"
              :elevation="0"
              icon="i-mdi:content-copy"
              size="small"
              @click="handleCopyUrl"
            >
            </v-btn>
          </div>
        </div>

        <!-- 注意事项 -->
        <div class="pa-4 rounded-xl bg-surface border d-flex flex-column ga-3">
          <div class="text-subtitle-2 font-weight-bold text-high-emphasis">注意事项</div>
          <div class="d-flex align-start text-body-2 text-medium-emphasis">
            <v-icon
              icon="i-mdi:numeric-1-circle"
              color="primary"
              size="20"
              class="mr-2 mt-0.5 flex-shrink-0"
            />
            <span>
              充电完成后，请刷新网页或前往<b>「账号资料」</b>点击<b>「刷新」</b>按钮更新帐号身份。
            </span>
          </div>
          <div class="d-flex align-start text-body-2 text-medium-emphasis">
            <v-icon
              icon="i-mdi:numeric-2-circle"
              color="primary"
              size="20"
              class="mr-2 mt-0.5 flex-shrink-0"
            />
            <span>可能存在<b>时间延迟</b>，若第一次刷新未成功，请<b>等待约 1 分钟</b>后再试。</span>
          </div>
          <div class="d-flex align-start text-body-2 text-medium-emphasis">
            <v-icon
              icon="i-mdi:numeric-3-circle"
              color="primary"
              size="20"
              class="mr-2 mt-0.5 flex-shrink-0"
            />
            <span>
              若多次刷新仍无效，请将<b>「帐号 ID」</b>与爱发电<b>「订单号」</b>发送至
              <a
                href="mailto:issues@uclimax.cn"
                class="text-primary font-weight-medium text-decoration-none"
              >
                issues@uclimax.cn
              </a>
              联系我们。
            </span>
          </div>
        </div>

        <!-- 充电福利折叠面板 -->
        <v-expansion-panels elevation="0" class="rounded-xl border">
          <v-expansion-panel class="bg-surface rounded-xl">
            <v-expansion-panel-title
              class="font-weight-bold text-subtitle-2 text-high-emphasis py-3 px-4"
            >
              <v-icon color="amber-darken-1" size="20" class="mr-2" icon="i-mdi:star-circle" />
              充电福利说明
            </v-expansion-panel-title>
            <v-expansion-panel-text class="px-2 pb-2">
              <v-list density="compact" bg-color="transparent" class="py-0">
                <v-list-item class="px-2 py-1">
                  <template #prepend>
                    <v-icon color="success" size="18" icon="i-mdi:check-circle" class="mr-2" />
                  </template>
                  <v-list-item-title class="text-body-2 font-weight-bold">
                    无限卡组数量
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">
                    创建和分享任意数量的卡组，不受限制
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item class="px-2 py-1">
                  <template #prepend>
                    <v-icon color="success" size="18" icon="i-mdi:check-circle" class="mr-2" />
                  </template>
                  <v-list-item-title class="text-body-2 font-weight-bold">
                    卡组历史记录
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">
                    随时查看历史版本
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item class="px-2 py-1">
                  <template #prepend>
                    <v-icon color="success" size="18" icon="i-mdi:check-circle" class="mr-2" />
                  </template>
                  <v-list-item-title class="text-body-2 font-weight-bold">
                    解除编辑卡组限制
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">
                    编辑卡组时可超过50张卡片限制
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item class="px-2 py-1">
                  <template #prepend>
                    <v-icon color="success" size="18" icon="i-mdi:check-circle" class="mr-2" />
                  </template>
                  <v-list-item-title class="text-body-2 font-weight-bold">
                    价格更新时间缩短
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">
                    价格每3小时会自动更新一次，方便您随时了解市场动态
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item class="px-2 py-1">
                  <template #prepend>
                    <v-icon color="success" size="18" icon="i-mdi:check-circle" class="mr-2" />
                  </template>
                  <v-list-item-title class="text-body-2 font-weight-bold">
                    起手调度模拟器
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption text-medium-emphasis">
                    模拟 5 张起手与调度策略，支持自定义规则
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <!-- Footer -->
      <v-card-actions class="bg-surface px-5 py-4 d-flex justify-end ga-2">
        <template v-if="!generatedUrl">
          <v-btn
            variant="flat"
            color="surface"
            rounded="pill"
            :elevation="0"
            class="px-5 font-weight-bold text-body-2"
            @click="model = false"
          >
            取消
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="pill"
            :elevation="0"
            :loading="isGenerating"
            prepend-icon="i-mdi:lightning-bolt"
            class="px-6 font-weight-bold text-body-2"
            @click="handleGenerateUrl"
          >
            生成充电链接
          </v-btn>
        </template>
        <template v-else>
          <v-btn
            color="primary"
            variant="flat"
            rounded="pill"
            :elevation="0"
            class="px-6 font-weight-bold text-body-2"
            @click="model = false"
          >
            关闭
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Auth Alert Dialog -->
  <AuthAlertDialog v-model="isAuthAlertOpen" />
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/composables/useSnackbar'
import { writeText } from '@/utils/clipboard'

const model = defineModel({ type: Boolean, default: false })

const authStore = useAuthStore()
const { triggerSnackbar } = useSnackbar()

const isAuthAlertOpen = ref(false)
const isGenerating = ref(false)
const generatedUrl = ref('')

watch(model, (val) => {
  if (!val) {
    generatedUrl.value = ''
  }
})

const handleGenerateUrl = async () => {
  if (!authStore.isAuthenticated) {
    isAuthAlertOpen.value = true
    return
  }
  isGenerating.value = true
  try {
    const url = await authStore.initiatePayment()
    generatedUrl.value = url
    triggerSnackbar('充电链接已生成，请点击复制')
  } catch (err) {
    console.error(err)
    triggerSnackbar(err?.message || '生成充电链接失败', 'error')
  } finally {
    isGenerating.value = false
  }
}

const handleCopyUrl = async () => {
  if (!generatedUrl.value) return
  try {
    await writeText(generatedUrl.value)
    triggerSnackbar('充电链接已复制至剪贴簿')
  } catch (err) {
    console.error('无法复制链接:', err)
    triggerSnackbar('复制失败，请手动复制。', 'error')
  }
}
</script>

<style scoped>
.sponsor-modal-card {
  border-radius: 28px !important;
  overflow: hidden;
}

.sponsor-modal-header,
.sponsor-modal-body {
  background-color: #efefef;
}

:deep(.v-theme--dark) .sponsor-modal-header,
:deep(.v-theme--dark) .sponsor-modal-body,
.v-theme--dark .sponsor-modal-header,
.v-theme--dark .sponsor-modal-body {
  background-color: #1e1e22;
}

.sponsor-divider {
  border-color: #cccccc !important;
  opacity: 1 !important;
}

:deep(.v-theme--dark) .sponsor-divider,
.v-theme--dark .sponsor-divider {
  border-color: rgba(255, 255, 255, 0.15) !important;
  opacity: 1 !important;
}
</style>
