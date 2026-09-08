<template>
  <v-container fluid class="download-view pa-0 h-100 d-flex flex-column">
    <div class="overflow-y-auto themed-scrollbar" :style="scrollStyle">
      <v-container
        class="h-100 pa-0 flex-grow-0"
        :class="{ 'mt-8': smAndUp, 'pa-4 pb-0': !smAndUp }"
      >
        <div class="d-flex justify-center px-3">
          <v-row class="w-100" :class="{ 'mb-10': !smAndUp }">
            <v-col cols="12">
              <!-- Header Section (Identical size, color and spacing as BanList) -->
              <div class="d-flex align-center mb-8" :class="smAndUp ? 'ga-4' : 'ga-3 mb-4'">
                <v-avatar
                  color="light-blue-accent-3"
                  :size="smAndUp ? 77 : 56"
                  class="rounded-circle shadow-sm pa-2"
                >
                  <v-icon icon="i-mdi:cloud-download" class="w-100 h-100" color="white" />
                </v-avatar>
                <div>
                  <h1 :class="smAndUp ? 'text-h4' : 'text-h5'" class="font-weight-bold mb-1">
                    客户端下载
                  </h1>
                  <div class="text-caption text-medium-emphasis mt-n1">跨平台桌面与移动端体验</div>
                  <div class="text-caption text-medium-emphasis" style="opacity: 0.8">
                    适用于 Windows、Android 与 Linux (amd64) 平台
                  </div>
                </div>
              </div>

              <v-divider
                :class="smAndUp ? 'mb-8' : 'mb-0'"
                :length="smAndUp ? '60%' : '100%'"
                thickness="3"
              ></v-divider>

              <!-- Supported Platforms Chips -->
              <div class="mt-8 mb-6">
                <div class="text-subtitle-1 font-weight-bold mb-3 text-medium-emphasis">
                  支持平台
                </div>
                <div class="d-flex flex-wrap ga-3">
                  <v-chip
                    v-for="platform in platforms"
                    :key="platform.name"
                    :color="platform.color"
                    variant="tonal"
                    size="small"
                    class="font-weight-bold"
                    rounded="pill"
                  >
                    <template #prepend>
                      <v-icon :icon="platform.icon" class="mr-1" />
                    </template>
                    {{ platform.name }}
                    <span class="text-caption font-weight-regular ml-1 text-medium-emphasis">
                      ({{ platform.desc }})
                    </span>
                  </v-chip>
                </div>
              </div>

              <!-- Features Section -->
              <div class="text-subtitle-1 font-weight-bold mb-4 text-medium-emphasis">
                客户端特性
              </div>
              <v-row class="mb-6">
                <v-col
                  v-for="feature in features"
                  :key="feature.title"
                  cols="12"
                  sm="6"
                  class="d-flex"
                >
                  <v-card
                    class="w-100 rounded-2lg"
                    :class="{ 'glass-card': hasBackgroundImage }"
                    elevation="2"
                  >
                    <v-card-text class="pa-5 d-flex ga-4 align-start">
                      <v-avatar :color="feature.color" size="44" class="rounded-lg flex-shrink-0">
                        <v-icon :icon="feature.icon" size="24" color="white" />
                      </v-avatar>
                      <div>
                        <div class="text-subtitle-1 font-weight-bold mb-1">
                          {{ feature.title }}
                        </div>
                        <div class="text-body-2 text-medium-emphasis">
                          {{ feature.desc }}
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Download Channels Section -->
              <div class="text-subtitle-1 font-weight-bold mb-4 text-medium-emphasis">下载渠道</div>

              <!-- Instructions & Tips Card -->
              <v-card
                class="mb-6 rounded-2lg"
                :class="{ 'glass-card': hasBackgroundImage }"
                elevation="2"
              >
                <v-card-text class="pa-5">
                  <div class="d-flex align-center mb-3">
                    <v-icon icon="i-mdi:information-outline" color="primary" class="mr-2" />
                    <span class="text-subtitle-1 font-weight-bold">安装与使用说明</span>
                  </div>
                  <v-list density="compact" bg-color="transparent" class="pa-0">
                    <v-list-item class="px-0 py-1">
                      <v-list-item-title class="text-body-2 text-wrap">
                        <strong>Windows 端</strong>：下载
                        <code>.exe</code> 安装程序后直接运行即可。如遇到 Windows SmartScreen
                        拦截提示，请点击「更多信息」并选择「仍要运行」。
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item class="px-0 py-1">
                      <v-list-item-title class="text-body-2 text-wrap">
                        <strong>Android 端</strong>：下载
                        <code>.apk</code>
                        文件后在手机上打开，如提示未知来源应用安装权限，请在系统设置中允许安装。
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item class="px-0 py-1">
                      <v-list-item-title class="text-body-2 text-wrap">
                        <strong>Linux (amd64) 端</strong>：支持
                        <code>.AppImage</code> 文件，下载后赋予执行权限 (<code>chmod +x</code>)
                        即可直接运行。
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item class="px-0 py-1">
                      <v-list-item-title class="text-body-2 text-wrap">
                        <strong>卡图加载与设置</strong
                        >：客户端提供<strong>「在线加载」</strong>与<strong>「本地卡图」</strong>两种模式，默认采用在线加载以节省本地磁盘空间。如需离线使用或体验无延迟秒开卡图，可随时在<strong
                          >「设置 - 卡图来源」</strong
                        >中切换为本地卡图并一键同步卡图包。
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>

              <!-- Download Channels Grid -->
              <v-row class="mb-8">
                <!-- GitCode Releases -->
                <v-col cols="12" md="6" class="d-flex">
                  <v-card
                    class="download-card w-100 rounded-2lg d-flex flex-column position-relative overflow-hidden"
                    :class="{ 'glass-card': hasBackgroundImage }"
                    elevation="2"
                  >
                    <v-card-text class="pa-5 d-flex flex-column h-100 position-relative z-1">
                      <div class="d-flex align-center justify-space-between mb-3">
                        <v-avatar color="red-lighten-5" size="44" class="rounded-lg pa-2">
                          <v-icon :icon="gitcodeIcon" class="w-100 h-100" />
                        </v-avatar>
                        <v-chip color="success" size="small" variant="flat" rounded="pill">
                          国内推荐
                        </v-chip>
                      </div>

                      <div class="text-h6 font-weight-bold mb-1">GitCode Releases</div>
                      <p class="text-body-2 text-medium-emphasis mb-4 flex-grow-1">
                        国内代码托管平台发布页，下载速度快且稳定，包含 Windows、Android 与 Linux
                        (amd64) 各平台最新安装包。
                      </p>

                      <v-btn
                        color="deep-orange-darken-2"
                        size="large"
                        variant="elevated"
                        rounded="pill"
                        block
                        append-icon="i-mdi:open-in-new"
                        @click="openUrl('https://gitcode.com/zhuang39/TCGToolWS/releases')"
                      >
                        前往 GitCode Releases
                      </v-btn>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- GitHub Releases -->
                <v-col cols="12" md="6" class="d-flex">
                  <v-card
                    class="download-card w-100 rounded-2lg d-flex flex-column position-relative overflow-hidden"
                    :class="{ 'glass-card': hasBackgroundImage }"
                    elevation="2"
                  >
                    <v-card-text class="pa-5 d-flex flex-column h-100 position-relative z-1">
                      <div class="d-flex align-center justify-space-between mb-3">
                        <v-avatar color="grey-darken-3" size="44" class="rounded-lg">
                          <v-icon icon="i-mdi:github" size="28" color="white" />
                        </v-avatar>
                        <v-chip color="grey" size="small" variant="tonal" rounded="pill">
                          官方源
                        </v-chip>
                      </div>

                      <div class="text-h6 font-weight-bold mb-1">GitHub Releases</div>
                      <p class="text-body-2 text-medium-emphasis mb-4 flex-grow-1">
                        GitHub 官方代码仓库发布页，提供完整版本更新日志
                        (Changelog)、源码与全部平台发布文件。
                      </p>

                      <v-btn
                        color="grey-darken-3"
                        size="large"
                        variant="elevated"
                        rounded="pill"
                        block
                        append-icon="i-mdi:open-in-new"
                        @click="openUrl('https://github.com/U-CLIMAX/TCGToolWS/releases')"
                      >
                        前往 GitHub Releases
                      </v-btn>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </div>
      </v-container>
    </div>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import { useUIStore } from '@/stores/ui'
import gitcodeIcon from '@/assets/ui/gitcode.svg'

definePage({
  name: 'Download',
})

const { smAndUp } = useDisplay()
const theme = useTheme()
const uiStore = useUIStore()

const hasBackgroundImage = computed(() => !!uiStore.backgroundImage)

const scrollStyle = computed(() => {
  const marginTop = smAndUp.value ? '50px' : '0'
  return {
    '--sb-margin-top': '27px',
    'marginTop': marginTop,
    'height': `calc(100% - ${marginTop})`,
  }
})

const platforms = [
  {
    name: 'Windows',
    desc: 'Windows 10 / 11 · x64',
    icon: 'i-mdi:microsoft-windows',
    color: 'blue-darken-1',
  },
  {
    name: 'Android',
    desc: '安卓 7.0+ · APK',
    icon: 'i-mdi:android',
    color: 'green-darken-1',
  },
  {
    name: 'Linux',
    desc: 'Linux amd64 · AppImage',
    icon: 'i-mdi:linux',
    color: 'orange-darken-2',
  },
]

const features = [
  {
    title: '本地离线卡图同步',
    desc: '支持下载卡图数据包至本地磁盘，享受秒开卡图体验，大幅节省网络流量。',
    icon: 'i-mdi:folder-sync-outline',
    color: 'light-blue-darken-1',
  },
  {
    title: '离线卡牌检索与组卡',
    desc: '内置完整的卡牌索引数据库，在无网络或免登录环境下依然能畅快检索卡牌、构筑并管理本地卡组，且能随时上传到云端保存。',
    icon: 'i-mdi:cards-outline',
    color: 'purple-darken-1',
  },
  {
    title: '跨平台与移动端适配',
    desc: '不仅支持 Windows 与 Linux 桌面端，还专为 Android 移动设备深度适配，对局现场、通勤途中皆可随时查卡组卡。',
    icon: 'i-mdi:devices',
    color: 'amber-darken-2',
  },
  {
    title: '自动检测与版本更新',
    desc: '内置客户端更新检测机制，卡圖、软件新版本一键获取，始终保持最新。',
    icon: 'i-mdi:update',
    color: 'teal-darken-1',
  },
]

const openUrl = (url) => {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
</script>

<style scoped>
.v-theme--light .download-view {
  background-color: rgba(243, 241, 241, 0.7);
}

.v-theme--dark .download-view {
  background-color: rgba(44, 43, 43, 0.7);
}

.download-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.download-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
}

.z-1 {
  z-index: 1;
}
</style>
