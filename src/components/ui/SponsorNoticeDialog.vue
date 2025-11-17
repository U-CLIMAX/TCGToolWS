<template>
  <v-dialog v-model="model" max-width="500px">
    <v-card class="overflow-y-auto themed-scrollbar">
      <v-card-title class="d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle-outline</v-icon>
        赞助使用须知
      </v-card-title>

      <v-card-text>
        <p class="mb-4">感谢您的支持！在您完成付款后，请注意以下事项：</p>

        <v-list density="compact" bg-color="transparent" class="py-0">
          <v-list-item prepend-icon="mdi-numeric-1-circle-outline" class="px-1">
            <v-list-item-title class="text-wrap">
              付款完成後，请前往<b>「账号资料」</b>，点击<b>「刷新」</b>按钮以更新您的帐号身份。
            </v-list-item-title>
          </v-list-item>

          <v-list-item prepend-icon="mdi-numeric-2-circle-outline" class="px-1">
            <v-list-item-title class="text-wrap">
              可能存在<b>时间延迟</b>，如果第一次刷新未成功，请<b>等待约 1 分钟</b>后再试。。
            </v-list-item-title>
          </v-list-item>

          <v-list-item prepend-icon="mdi-numeric-3-circle-outline" class="px-1">
            <v-list-item-title class="text-wrap">
              若多次刷新仍无效，请将您的 <b>「帐号 ID」</b> 复制后，发送至
              <a href="mailto:issues@uclimax.cn">issues@uclimax.cn</a>
              联系我们，我们会协助您解决问题。
            </v-list-item-title>
          </v-list-item>
        </v-list>

        <v-divider class="my-4"></v-divider>

        <v-expansion-panels class="mb-4" elevation="0">
          <v-expansion-panel>
            <v-expansion-panel-title class="font-weight-bold">
              <v-icon color="light-blue-lighten-3" size="small" class="mr-2">
                mdi-star-circle
              </v-icon>
              赞助会员特权
              <v-spacer></v-spacer>
              <span class="text-h6 font-weight-bold text-green-lighten-1">¥5</span>
              <span class="text-body-2 ml-1">/月</span>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list bg-color="transparent" class="flex-grow-1">
                <v-list-item class="px-0 mb-3">
                  <template v-slot:prepend>
                    <v-icon color="green-accent-2" size="20">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title class="text-body-1 font-weight-medium">
                    无限卡组数量
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    创建任意数量的卡组，不受限制
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item class="px-0 mb-3">
                  <template v-slot:prepend>
                    <v-icon color="green-accent-2" size="20">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title class="text-body-1 font-weight-medium">
                    卡组历史记录
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    随时查看历史版本
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item class="px-0 mb-3">
                  <template v-slot:prepend>
                    <v-icon color="green-accent-2" size="20">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title class="text-body-1 font-weight-medium">
                    解除编辑卡组限制
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    编辑卡组时可超过50张卡片限制
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
        <div class="text-caption text-center mb-3">赞助周期以 1 个月计算，每笔赞助最多 1 个月</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text="取消" @click="model = false"></v-btn>
        <v-btn color="primary" variant="elevated" @click="handleConfirm"> 我了解了，继续 </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
const model = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['confirm'])

const handleConfirm = () => {
  model.value = false
  emit('confirm')
}
</script>
