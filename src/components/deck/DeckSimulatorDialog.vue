<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="!smAndUp"
    max-width="1050"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card
      class="d-flex flex-column"
      :class="{ 'rounded-2lg': smAndUp }"
      :style="smAndUp ? 'height: 88vh; max-height: 880px;' : 'height: 100vh;'"
    >
      <!-- Dialog Header -->
      <div class="pa-4 d-flex justify-space-between align-center flex-shrink-0">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" variant="tonal" size="40" class="rounded-lg">
            <v-icon icon="i-mdi:cards-playing-outline" size="24" color="primary" />
          </v-avatar>
          <div>
            <div class="text-h6 font-weight-bold d-flex align-center ga-2">
              <span>起手模拟器</span>
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ deckName }} · 共 {{ totalDeckCount }} 张卡牌
            </div>
          </div>
        </div>
        <v-btn icon="i-mdi:close" variant="text" density="comfortable" @click="closeDialog" />
      </div>

      <!-- Tab Navigation -->
      <div class="flex-shrink-0">
        <v-tabs v-model="activeTab" color="primary" density="compact" grow>
          <v-tab value="batch" class="text-subtitle-2 font-weight-medium">
            <v-icon icon="i-mdi:chart-box-outline" start />
            {{ smAndUp ? '大数据统计分析' : '统计' }}
          </v-tab>
          <v-tab value="single" class="text-subtitle-2 font-weight-medium">
            <v-icon icon="i-mdi:dice-multiple-outline" start />
            {{ smAndUp ? '单次起手模拟' : '单次' }}
          </v-tab>
          <v-tab value="rules" class="text-subtitle-2 font-weight-medium">
            <v-icon icon="i-mdi:tune-variant" start />
            {{
              smAndUp
                ? `调度规则配置 (${activeRules.length}/${rules.length})`
                : `规则 (${activeRules.length}/${rules.length})`
            }}
          </v-tab>
        </v-tabs>
      </div>

      <!-- Tab Content Area -->
      <v-card-text class="pa-4 flex-grow-1 overflow-y-auto themed-scrollbar">
        <!-- =================== TAB 1: 批量统计分析 =================== -->
        <div v-if="activeTab === 'batch'" class="d-flex flex-column ga-4">
          <!-- 顶部控制条 -->
          <v-card variant="flat" class="sim-section-card pa-3 rounded-xl">
            <div class="d-flex flex-wrap align-center justify-space-between ga-3">
              <div class="d-flex align-center flex-wrap ga-2">
                <span class="text-caption text-medium-emphasis mr-1">模拟样本量:</span>
                <v-btn-toggle
                  v-model="sampleSize"
                  mandatory
                  density="compact"
                  color="primary"
                  variant="outlined"
                  class="rounded-pill"
                >
                  <v-btn :value="500" size="small">500</v-btn>
                  <v-btn :value="1000" size="small">1,000</v-btn>
                  <v-btn :value="5000" size="small">5,000</v-btn>
                  <v-btn :value="10000" size="small">10,000</v-btn>
                </v-btn-toggle>
              </div>

              <v-btn
                color="primary"
                variant="elevated"
                class="rounded-pill px-5 ml-auto"
                :loading="isSimulating"
                prepend-icon="i-mdi:play-circle"
                @click="runBatch()"
              >
                开始模拟
              </v-btn>
            </div>
          </v-card>

          <!-- 模拟结果 -->
          <template v-if="batchResult">
            <!-- 核心 KPI 汇总卡片 -->
            <v-row dense>
              <v-col cols="6" sm="3">
                <v-card variant="flat" class="sim-section-card pa-3 text-center rounded-xl h-100">
                  <div class="text-caption text-medium-emphasis mb-1">平均调度换牌</div>
                  <div class="text-h5 font-weight-black font-DINCond text-primary">
                    {{ batchResult.avgDiscardCount }}
                    <span class="text-caption font-weight-regular text-medium-emphasis">张</span>
                  </div>
                  <div class="text-caption text-disabled mt-1">起手 5 张平均扔出</div>
                </v-card>
              </v-col>

              <v-col cols="6" sm="3">
                <v-card variant="flat" class="sim-section-card pa-3 text-center rounded-xl h-100">
                  <div class="text-caption text-medium-emphasis mb-1">0等角色上手率</div>
                  <div class="text-h5 font-weight-black font-DINCond text-success">
                    {{ batchResult.atLeastOneLvl0CharProb }}%
                  </div>
                  <div class="text-caption text-disabled mt-1">手牌至少 1 张 0 等</div>
                </v-card>
              </v-col>

              <v-col cols="6" sm="3">
                <v-card variant="flat" class="sim-section-card pa-3 text-center rounded-xl h-100">
                  <div class="text-caption text-medium-emphasis mb-1">手牌无高潮卡 (0 CX)</div>
                  <div class="text-h5 font-weight-black font-DINCond text-teal-accent-4">
                    {{ batchResult.zeroCxProb }}%
                  </div>
                  <div class="text-caption text-disabled mt-1">起手不留高潮卡安全率</div>
                </v-card>
              </v-col>

              <v-col cols="6" sm="3">
                <v-card variant="flat" class="sim-section-card pa-3 text-center rounded-xl h-100">
                  <div class="text-caption text-medium-emphasis mb-1">已套用规则数</div>
                  <div class="text-h5 font-weight-black font-DINCond text-info">
                    {{ rules.length }}
                    <span class="text-caption font-weight-regular text-medium-emphasis">条</span>
                  </div>
                  <div class="text-caption text-disabled mt-1">依序自上而下匹配</div>
                </v-card>
              </v-col>
            </v-row>

            <!-- 种类与等级综合统计 -->
            <v-row dense>
              <!-- 种类上手率 -->
              <v-col cols="12" md="6">
                <v-card variant="flat" class="sim-section-card pa-4 rounded-xl h-100">
                  <div class="d-flex justify-space-between align-center mb-3">
                    <span class="text-subtitle-2 font-weight-bold d-flex align-center ga-2">
                      <v-icon icon="i-mdi:shape-outline" size="18" color="primary" />
                      卡牌种类上手率
                    </span>
                    <span class="text-caption text-medium-emphasis">初抽 ➔ 调度后</span>
                  </div>

                  <div class="d-flex flex-column ga-2">
                    <div
                      v-for="item in batchResult.typeResults"
                      :key="item.type"
                      class="sim-stat-row pa-2 rounded-2lg"
                    >
                      <div class="d-flex justify-space-between align-center mb-1">
                        <div class="d-flex align-center ga-2">
                          <v-chip
                            size="x-small"
                            :color="getTypeChipColor(item.type)"
                            variant="flat"
                            class="font-weight-bold text-white"
                          >
                            {{ item.type }}
                          </v-chip>
                          <span class="text-caption text-medium-emphasis">
                            均 {{ item.avgCopies }} 张
                          </span>
                        </div>
                        <div class="d-flex align-center ga-2">
                          <span class="text-caption text-disabled">
                            {{ item.initialProb }}% ➔
                          </span>
                          <span class="text-subtitle-2 font-weight-black font-DINCond">
                            {{ item.finalProb }}%
                          </span>
                          <v-chip
                            size="x-small"
                            :color="item.deltaProb >= 0 ? 'success' : 'error'"
                            variant="tonal"
                            class="font-weight-bold"
                          >
                            {{ item.deltaProb >= 0 ? `+${item.deltaProb}` : item.deltaProb }}%
                          </v-chip>
                        </div>
                      </div>
                      <v-progress-linear
                        :model-value="item.finalProb"
                        :color="getTypeChipColor(item.type)"
                        height="6"
                        rounded
                      />
                    </div>
                  </div>
                </v-card>
              </v-col>

              <!-- 各等级上手率 -->
              <v-col cols="12" md="6">
                <v-card variant="flat" class="sim-section-card pa-4 rounded-xl h-100">
                  <div class="d-flex justify-space-between align-center mb-3">
                    <span class="text-subtitle-2 font-weight-bold d-flex align-center ga-2">
                      <v-icon icon="i-mdi:stairs" size="18" color="info" />
                      各等级上手率
                    </span>
                    <span class="text-caption text-medium-emphasis">至少 1 张概率</span>
                  </div>

                  <div class="d-flex flex-column ga-2">
                    <div
                      v-for="lvl in batchResult.levelResults"
                      :key="lvl.level"
                      class="sim-stat-row pa-2 rounded-2lg"
                    >
                      <div class="d-flex justify-space-between align-center mb-1">
                        <div class="d-flex align-center ga-2">
                          <v-avatar
                            size="20"
                            :color="getLevelColor(lvl.level)"
                            class="text-white text-caption font-weight-bold"
                          >
                            {{ lvl.level }}
                          </v-avatar>
                          <span class="text-subtitle-2">Lv.{{ lvl.level }}</span>
                          <span class="text-caption text-medium-emphasis">
                            均 {{ lvl.avgCopies }} 张
                          </span>
                        </div>
                        <div class="d-flex align-center ga-2">
                          <span class="text-caption text-disabled"> {{ lvl.initialProb }}% ➔ </span>
                          <span class="text-subtitle-2 font-weight-black font-DINCond">
                            {{ lvl.finalProb }}%
                          </span>
                          <v-chip
                            size="x-small"
                            :color="lvl.deltaProb >= 0 ? 'success' : 'error'"
                            variant="tonal"
                            class="font-weight-bold"
                          >
                            {{ lvl.deltaProb >= 0 ? `+${lvl.deltaProb}` : lvl.deltaProb }}%
                          </v-chip>
                        </div>
                      </div>
                      <v-progress-linear
                        :model-value="lvl.finalProb"
                        :color="getLevelColor(lvl.level)"
                        height="6"
                        rounded
                      />
                    </div>
                  </div>
                </v-card>
              </v-col>
            </v-row>

            <!-- 单卡上手率矩阵画廊 -->
            <v-card variant="flat" class="sim-section-card pa-4 rounded-xl">
              <div class="mb-3">
                <div class="text-subtitle-2 font-weight-bold d-flex align-center ga-2">
                  <v-icon icon="i-mdi:view-grid-outline" size="18" color="primary" />
                  单卡上手率 ({{ batchResult?.cardResults?.length || 0 }} 种)
                </div>
                <div class="text-caption text-medium-emphasis">
                  卡图 · 投入张数 · 初抽与调度后上手率
                </div>
              </div>

              <!-- 卡片网格展示 -->
              <v-row dense>
                <v-col
                  v-for="item in batchResult?.cardResults || []"
                  :key="item.card.id"
                  cols="4"
                  md="3"
                  lg="2"
                >
                  <v-card
                    elevation="1"
                    class="h-100 rounded-3md overflow-hidden d-flex flex-column single-card-item"
                  >
                    <!-- 卡图区域 -->
                    <div class="position-relative">
                      <v-img
                        :src="getCardImage(item.card).base"
                        :lazy-src="getCardImage(item.card).blur"
                        :aspect-ratio="400 / 559"
                        cover
                      >
                        <template #error>
                          <v-img src="/placehold.webp" :aspect-ratio="400 / 559" cover />
                        </template>

                        <!-- 投入张数标记 -->
                        <div class="position-absolute" style="top: 3px; right: 3px">
                          <v-chip
                            size="x-small"
                            color="primary"
                            variant="elevated"
                            class="font-weight-bold"
                          >
                            ×{{ item.quantity }}
                          </v-chip>
                        </div>
                      </v-img>
                    </div>

                    <!-- 卡牌信息与上手率 -->
                    <div class="pa-2 d-flex flex-column flex-grow-1">
                      <div class="text-caption text-disabled text-truncate lh-tight">
                        {{ item.card.id }}
                      </div>
                      <div
                        class="text-caption font-weight-bold text-truncate lh-tight"
                        :title="item.card.name"
                      >
                        {{ item.card.name }}
                      </div>

                      <div class="mt-auto pt-1">
                        <div class="d-flex justify-space-between align-baseline">
                          <span class="text-caption text-medium-emphasis sim-label-small"
                            >上手率</span
                          >
                          <span
                            class="text-subtitle-2 font-weight-black font-DINCond"
                            :class="getProbTextColor(item.finalProb)"
                          >
                            {{ item.finalProb }}%
                          </span>
                        </div>

                        <v-progress-linear
                          :model-value="item.finalProb"
                          :color="getProbBarColor(item.finalProb)"
                          height="3"
                          rounded
                          class="my-1"
                        />

                        <div
                          class="d-flex justify-space-between align-center sim-label-small text-disabled"
                        >
                          <span>{{ item.initialProb }}%</span>
                          <span :class="item.deltaProb >= 0 ? 'text-success' : 'text-error'">
                            {{ item.deltaProb >= 0 ? `+${item.deltaProb}` : item.deltaProb }}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </v-card>
          </template>

          <!-- 未运算占位状态 -->
          <div v-else class="text-center py-12">
            <v-avatar size="64" color="primary" variant="tonal" class="mb-3">
              <v-icon icon="i-mdi:play-circle-outline" size="36" />
            </v-avatar>
            <div class="text-subtitle-1 font-weight-bold">准备就绪，点击上方按钮开始计算</div>
            <div class="text-caption text-medium-emphasis mt-1 mb-4">
              将根据调度规则执行 {{ sampleSize.toLocaleString() }} 次公平洗牌与抽样统计
            </div>
          </div>
        </div>

        <!-- =================== TAB 2: 单次起手演练 =================== -->
        <div v-if="activeTab === 'single'" class="d-flex flex-column ga-4">
          <!-- 单次抽牌控制 -->
          <div class="d-flex justify-space-between align-center flex-wrap ga-2">
            <div>
              <div class="text-subtitle-1 font-weight-bold">单次模拟起手与调度</div>
              <div class="text-caption text-medium-emphasis">
                体验随机抽取 5 张牌并按规则判定的实时过程
              </div>
            </div>

            <v-btn
              color="primary"
              variant="elevated"
              class="rounded-pill px-5"
              prepend-icon="i-mdi:dice-multiple"
              @click="runSingle()"
            >
              抽取起手 5 张
            </v-btn>
          </div>

          <template v-if="singleResult">
            <!-- 阶段 1: 初始 5 张抽牌 -->
            <v-card variant="flat" class="sim-section-card pa-4 rounded-xl">
              <div class="d-flex flex-wrap justify-space-between align-center mb-3 ga-2">
                <span class="text-subtitle-2 font-weight-bold d-flex align-center ga-2">
                  <v-chip size="small" color="primary" variant="flat">步骤 1</v-chip>
                  初始手牌 (5 张) 与调度判定
                </span>
                <span class="text-caption text-medium-emphasis">
                  保留 {{ singleResult.keptCards.length }} / 丢弃
                  {{ singleResult.discardedCards.length }}
                </span>
              </div>

              <v-row dense>
                <v-col
                  v-for="(card, idx) in singleResult.initialHand"
                  :key="`${card.id}_init_${idx}`"
                  cols="4"
                  md="3"
                  lg="2"
                >
                  <v-card
                    variant="flat"
                    class="rounded-3md overflow-hidden h-100 hand-card-item"
                    :class="{
                      'keep-border': isCardKept(idx),
                      'discard-border': !isCardKept(idx),
                    }"
                  >
                    <div class="position-relative">
                      <v-img
                        :src="getCardImage(card).base"
                        :lazy-src="getCardImage(card).blur"
                        :aspect-ratio="400 / 559"
                        cover
                      >
                        <template #error>
                          <v-img src="/placehold.webp" :aspect-ratio="400 / 559" cover />
                        </template>
                      </v-img>
                      <div class="position-absolute" style="top: 4px; right: 4px">
                        <v-chip
                          size="x-small"
                          :color="isCardKept(idx) ? 'success' : 'error'"
                          variant="elevated"
                          class="font-weight-bold"
                        >
                          <v-icon
                            :icon="isCardKept(idx) ? 'i-mdi:check-circle' : 'i-mdi:close-circle'"
                            start
                            size="12"
                          />
                          {{ isCardKept(idx) ? '留' : '弃' }}
                        </v-chip>
                      </div>
                    </div>
                    <div class="pa-1">
                      <div class="text-caption text-disabled text-truncate">
                        {{ card.id }}
                      </div>
                      <div class="text-caption font-weight-bold text-truncate">
                        {{ card.name }}
                      </div>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </v-card>

            <!-- 阶段 2: 最终调度后 5 张手牌 -->
            <v-card variant="flat" class="sim-section-card pa-4 rounded-xl">
              <div class="d-flex flex-wrap justify-space-between align-center mb-3 ga-2">
                <span class="text-subtitle-2 font-weight-bold d-flex align-center ga-2">
                  <v-chip size="small" color="success" variant="flat">步骤 2</v-chip>
                  最终手牌 (补抽 {{ singleResult.replacementCards.length }} 张)
                </span>
                <span class="text-caption text-medium-emphasis">调度后最终 5 张</span>
              </div>

              <v-row dense>
                <v-col
                  v-for="(card, idx) in singleResult.finalHand"
                  :key="`${card.id}_final_${idx}`"
                  cols="4"
                  md="3"
                  lg="2"
                >
                  <v-card
                    variant="flat"
                    class="rounded-3md overflow-hidden h-100 hand-card-item"
                    :class="{
                      'redraw-border': isRedrawnCard(idx),
                    }"
                  >
                    <div class="position-relative">
                      <v-img
                        :src="getCardImage(card).base"
                        :lazy-src="getCardImage(card).blur"
                        :aspect-ratio="400 / 559"
                        cover
                      >
                        <template #error>
                          <v-img src="/placehold.webp" :aspect-ratio="400 / 559" cover />
                        </template>
                      </v-img>
                      <div
                        v-if="isRedrawnCard(idx)"
                        class="position-absolute"
                        style="top: 4px; right: 4px"
                      >
                        <v-chip
                          size="x-small"
                          color="info"
                          variant="elevated"
                          class="font-weight-bold"
                        >
                          <v-icon icon="i-mdi:lightning-bolt" start size="12" />
                          补抽
                        </v-chip>
                      </div>
                    </div>
                    <div class="pa-1">
                      <div class="text-caption text-disabled text-truncate">
                        {{ card.id }}
                      </div>
                      <div class="text-caption font-weight-bold text-truncate">
                        {{ card.name }}
                      </div>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </v-card>
          </template>

          <div v-else class="text-center py-12">
            <v-avatar size="64" color="primary" variant="tonal" class="mb-3">
              <v-icon icon="i-mdi:dice-multiple-outline" size="36" />
            </v-avatar>
            <div class="text-subtitle-1 font-weight-bold">准备就绪，点击上方按钮抽取起手</div>
            <div class="text-caption text-medium-emphasis mt-1 mb-4">
              将随机抽取 5 张牌并按当前调度规则进行判定
            </div>
          </div>
        </div>

        <!-- =================== TAB 3: 调度规则配置 =================== -->
        <div v-if="activeTab === 'rules'" class="d-flex flex-column ga-4">
          <div class="d-flex justify-space-between align-center flex-wrap ga-2">
            <div>
              <div class="text-subtitle-1 font-weight-bold">起手保留规则 (由上而下逐条执行)</div>
              <div class="text-caption text-medium-emphasis">
                优先符合规则的卡牌会先被处理且不重复判定。未符合任何规则的卡牌一律弃牌（高潮卡默认视为
                0 等）。
              </div>
            </div>

            <div class="d-flex ga-2">
              <v-btn
                variant="outlined"
                color="secondary"
                size="small"
                class="rounded-pill"
                @click="resetRules"
              >
                重置默认
              </v-btn>
              <v-btn
                color="primary"
                variant="tonal"
                size="small"
                class="rounded-pill"
                prepend-icon="i-mdi:plus"
                @click="openAddRuleModal"
              >
                添加规则
              </v-btn>
            </div>
          </div>

          <!-- 规则列表 -->
          <div v-if="rules.length > 0" class="d-flex flex-column ga-2">
            <v-card
              v-for="(rule, idx) in rules"
              :key="rule.id"
              variant="flat"
              class="sim-section-card pa-3 rounded-xl d-flex align-center justify-space-between ga-3 rule-card-item"
              :class="{ 'rule-card-disabled': rule.enabled === false }"
            >
              <div class="d-flex align-center ga-3 flex-grow-1" style="min-width: 0">
                <v-chip
                  size="x-small"
                  :color="rule.enabled === false ? 'default' : 'primary'"
                  :variant="rule.enabled === false ? 'tonal' : 'elevated'"
                  class="font-weight-bold flex-shrink-0"
                >
                  #{{ idx + 1 }}
                </v-chip>

                <!-- 分段式彩色 Chip 標籤組 (純文字無圖示) -->
                <div class="d-flex align-center flex-wrap ga-2 flex-grow-1" style="min-width: 0">
                  <!-- 1. 前提條件 (若有) -->
                  <template
                    v-if="
                      rule.conditionCard &&
                      (rule.conditionType === 'has_card' || rule.conditionType === 'not_has_card')
                    "
                  >
                    <v-chip
                      size="small"
                      :color="rule.conditionType === 'has_card' ? 'info' : 'deep-orange'"
                      variant="tonal"
                      class="font-weight-bold flex-shrink-0 h-auto py-1"
                    >
                      <span class="text-wrap text-break">
                        {{
                          rule.conditionType === 'has_card'
                            ? `若含 ${rule.conditionCard} (留${rule.conditionCardKeepCount || 1}张)`
                            : `若无 ${rule.conditionCard}`
                        }}
                      </span>
                    </v-chip>
                    <span class="text-caption text-disabled flex-shrink-0 font-weight-bold">➔</span>
                  </template>

                  <!-- 2. 判定對象 -->
                  <v-chip
                    size="small"
                    color="primary"
                    variant="tonal"
                    class="font-weight-bold flex-shrink-0 h-auto py-1"
                  >
                    <span class="text-wrap text-break">{{ getTargetLabel(rule) }}</span>
                  </v-chip>

                  <span class="text-caption text-disabled flex-shrink-0 font-weight-bold">➔</span>

                  <!-- 3. 執行策略 -->
                  <v-chip
                    size="small"
                    :color="getPolicyColor(rule)"
                    variant="tonal"
                    class="font-weight-bold flex-shrink-0 h-auto py-1"
                  >
                    <span class="text-wrap text-break">{{ getPolicyLabel(rule) }}</span>
                  </v-chip>

                  <!-- 3.1 優先/排除微調 -->
                  <v-chip
                    v-if="
                      rule.limitType === 'at_most' &&
                      rule.priorityCard &&
                      rule.priorityModifier !== 'none'
                    "
                    size="x-small"
                    :color="
                      rule.priorityModifier === 'prioritize_card' ? 'amber-darken-2' : 'error'
                    "
                    variant="tonal"
                    class="font-weight-bold flex-shrink-0 h-auto py-1"
                  >
                    <span class="text-wrap text-break">
                      {{
                        rule.priorityModifier === 'prioritize_card'
                          ? `优先 ${rule.priorityCard} ×${rule.priorityCount || 1}`
                          : `排除 ${rule.priorityCard}`
                      }}
                    </span>
                  </v-chip>
                </div>
              </div>

              <!-- 开关、排序与删除按钮 -->
              <div class="d-flex align-center ga-1 flex-shrink-0">
                <v-switch
                  v-model="rule.enabled"
                  color="primary"
                  density="compact"
                  hide-details
                  class="mr-1"
                />
                <v-btn
                  icon="i-mdi:arrow-up"
                  variant="text"
                  size="small"
                  density="compact"
                  :disabled="idx === 0"
                  @click="moveRuleUp(idx)"
                />
                <v-btn
                  icon="i-mdi:arrow-down"
                  variant="text"
                  size="small"
                  density="compact"
                  :disabled="idx === rules.length - 1"
                  @click="moveRuleDown(idx)"
                />
                <v-btn
                  icon="i-mdi:trash-can-outline"
                  variant="text"
                  color="error"
                  size="small"
                  density="compact"
                  @click="removeRule(idx)"
                  class="ml-1"
                />
              </div>
            </v-card>
          </div>

          <v-card v-else variant="flat" class="sim-section-card pa-8 text-center rounded-xl">
            <div class="text-body-2 text-medium-emphasis">
              目前没有保留规则，起手 5 张将全部丢弃重抽。
            </div>
            <v-btn
              color="primary"
              variant="tonal"
              size="small"
              class="rounded-pill mt-3"
              @click="resetRules"
            >
              恢复标准 0 等保留策略
            </v-btn>
          </v-card>
        </div>
      </v-card-text>

      <!-- 添加规则弹窗 -->
      <v-dialog v-model="showAddRuleModal" max-width="540" scrollable>
        <v-card class="pa-2 rounded-2lg">
          <v-card-title class="d-flex justify-space-between align-center px-4 pt-3 pb-2">
            <div class="d-flex align-center ga-2">
              <v-avatar color="primary" variant="tonal" size="32" class="rounded-lg">
                <v-icon icon="i-mdi:tune" size="18" color="primary" />
              </v-avatar>
              <span class="font-weight-bold text-subtitle-1">添加调度规则</span>
            </div>
            <v-btn
              icon="i-mdi:close"
              variant="text"
              size="small"
              density="comfortable"
              @click="showAddRuleModal = false"
            />
          </v-card-title>

          <v-card-text class="px-4 py-2 d-flex flex-column ga-3">
            <!-- 1. 触发前提 -->
            <v-card variant="flat" class="sim-modal-section pa-3 rounded-lg">
              <div
                class="text-caption font-weight-bold text-medium-emphasis mb-2 d-flex align-center ga-1"
              >
                <span>1. 手牌触发條件</span>
              </div>
              <v-btn-toggle
                v-model="newRuleForm.conditionType"
                mandatory
                density="compact"
                color="primary"
                variant="outlined"
                class="w-100 rounded-pill mb-3"
              >
                <v-btn value="always" class="flex-1-1">总是执行</v-btn>
                <v-btn value="has_card" class="flex-1-1">含某卡</v-btn>
                <v-btn value="not_has_card" class="flex-1-1">不含某卡</v-btn>
              </v-btn-toggle>

              <!-- 前提指定单卡与保留张数 -->
              <div
                v-if="newRuleForm.conditionType === 'has_card'"
                class="d-flex flex-wrap ga-2 align-stretch"
              >
                <v-select
                  v-model="newRuleForm.conditionCard"
                  :items="deckCardSelectItems"
                  label="选择卡组单卡"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="flex-1-1"
                  style="min-width: 220px"
                  :menu-props="{ contentClass: 'themed-scrollbar scrollbar-gutter-auto' }"
                >
                  <template #selection="{ item }">
                    <div class="d-flex align-center ga-2" style="max-width: 100%; height: 24px">
                      <div class="sim-select-thumb-mini">
                        <v-img :src="item.raw.imageUrl" :aspect-ratio="400 / 559" cover />
                      </div>
                      <span class="text-truncate text-body-2">{{ item.raw.title }}</span>
                    </div>
                  </template>
                  <template #item="{ props: itemProps, item }">
                    <v-list-item
                      v-bind="itemProps"
                      :title="item.raw.title"
                      :subtitle="item.raw.subtitle"
                    >
                      <template #prepend>
                        <div class="sim-select-thumb mr-2">
                          <v-img :src="item.raw.imageUrl" :aspect-ratio="400 / 559" cover />
                        </div>
                      </template>
                    </v-list-item>
                  </template>
                </v-select>

                <v-select
                  v-model="newRuleForm.conditionCardKeepCount"
                  :items="[1, 2, 3, 4, 5]"
                  label="保留张数(最多)"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="flex-1-1"
                  style="min-width: 140px"
                />
              </div>

              <!-- 不含某卡时仅显示单卡选择 -->
              <v-select
                v-else-if="newRuleForm.conditionType === 'not_has_card'"
                v-model="newRuleForm.conditionCard"
                :items="deckCardSelectItems"
                label="指定排除单卡"
                density="compact"
                variant="outlined"
                hide-details
                :menu-props="{ contentClass: 'themed-scrollbar scrollbar-gutter-auto' }"
              >
                <template #selection="{ item }">
                  <div class="d-flex align-center ga-2" style="max-width: 100%; height: 24px">
                    <div class="sim-select-thumb-mini">
                      <v-img :src="item.raw.imageUrl" :aspect-ratio="400 / 559" cover />
                    </div>
                    <span class="text-truncate text-body-2">{{ item.raw.title }}</span>
                  </div>
                </template>
                <template #item="{ props: itemProps, item }">
                  <v-list-item
                    v-bind="itemProps"
                    :title="item.raw.title"
                    :subtitle="item.raw.subtitle"
                  >
                    <template #prepend>
                      <div class="sim-select-thumb mr-2">
                        <v-img :src="item.raw.imageUrl" :aspect-ratio="400 / 559" cover />
                      </div>
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </v-card>

            <!-- 2. 维度选择 -->
            <v-card variant="flat" class="sim-modal-section pa-3 rounded-lg">
              <div
                class="text-caption font-weight-bold text-medium-emphasis mb-2 d-flex align-center ga-1"
              >
                <span>2. 判定对象</span>
              </div>
              <v-btn-toggle
                v-model="newRuleForm.type"
                mandatory
                density="compact"
                color="primary"
                variant="outlined"
                class="w-100 rounded-pill mb-3"
              >
                <v-btn value="level" class="flex-1-1">卡牌等级</v-btn>
                <v-btn value="specific_card" class="flex-1-1">指定单卡</v-btn>
                <v-btn value="card_type" class="flex-1-1">卡牌种类</v-btn>
              </v-btn-toggle>

              <!-- 等级条件 -->
              <div v-if="newRuleForm.type === 'level'" class="d-flex flex-wrap ga-2 align-stretch">
                <v-select
                  v-model="newRuleForm.operator"
                  :items="[
                    { title: '等于 (=)', value: '=' },
                    { title: '大于等于 (>=)', value: '>=' },
                    { title: '小于等于 (<=)', value: '<=' },
                  ]"
                  label="比较方式"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="flex-1-1"
                  style="min-width: 180px"
                />
                <v-select
                  v-model="newRuleForm.levelTarget"
                  :items="[
                    { title: '0 等', value: 0 },
                    { title: '1 等', value: 1 },
                    { title: '2 等', value: 2 },
                    { title: '3 等', value: 3 },
                  ]"
                  label="等级"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="flex-1-1"
                  style="min-width: 140px"
                />
              </div>

              <!-- 指定单卡条件 -->
              <div v-if="newRuleForm.type === 'specific_card'">
                <v-select
                  v-model="newRuleForm.cardTarget"
                  :items="deckCardSelectItems"
                  label="选择卡组单卡"
                  density="compact"
                  variant="outlined"
                  hide-details
                  :menu-props="{ contentClass: 'themed-scrollbar scrollbar-gutter-auto' }"
                >
                  <template #selection="{ item }">
                    <div class="d-flex align-center ga-2" style="max-width: 100%; height: 24px">
                      <div class="sim-select-thumb-mini">
                        <v-img :src="item.raw.imageUrl" :aspect-ratio="400 / 559" cover />
                      </div>
                      <span class="text-truncate text-body-2">{{ item.raw.title }}</span>
                    </div>
                  </template>
                  <template #item="{ props: itemProps, item }">
                    <v-list-item
                      v-bind="itemProps"
                      :title="item.raw.title"
                      :subtitle="item.raw.subtitle"
                    >
                      <template #prepend>
                        <div class="sim-select-thumb mr-2">
                          <v-img :src="item.raw.imageUrl" :aspect-ratio="400 / 559" cover />
                        </div>
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </div>

              <!-- 卡牌种类条件 -->
              <div v-if="newRuleForm.type === 'card_type'">
                <v-select
                  v-model="newRuleForm.cardTypeTarget"
                  :items="['角色卡', '事件卡', '高潮卡']"
                  label="种类"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </div>
            </v-card>

            <!-- 3. 保留策略 -->
            <v-card variant="flat" class="sim-modal-section pa-3 rounded-lg">
              <div
                class="text-caption font-weight-bold text-medium-emphasis mb-2 d-flex align-center ga-1"
              >
                <span>3. 保留策略</span>
              </div>
              <div class="d-flex flex-wrap ga-2 align-stretch">
                <v-select
                  v-model="newRuleForm.limitType"
                  :items="[
                    { title: '保留 最多', value: 'at_most' },
                    { title: '全部保留', value: 'all' },
                    { title: '全部丢弃 (保留 0 张)', value: 'none' },
                  ]"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="flex-1-1"
                  style="min-width: 220px"
                />
                <v-select
                  v-if="newRuleForm.limitType === 'at_most'"
                  v-model="newRuleForm.limitCount"
                  :items="[1, 2, 3, 4, 5]"
                  label="张数"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="flex-1-1"
                  style="min-width: 140px"
                />
              </div>

              <!-- 3.1 优先/排除微调 -->
              <div
                v-if="newRuleForm.limitType === 'at_most'"
                class="mt-3 pt-3 d-flex flex-column ga-2"
                style="border-top: 1px dashed rgba(var(--v-border-color), 0.2)"
              >
                <div class="text-caption text-medium-emphasis">单卡保留优先级 (可选)</div>
                <v-select
                  v-model="newRuleForm.priorityModifier"
                  :items="[
                    { title: '无微调 (按手牌抽取顺序)', value: 'none' },
                    { title: '优先保留指定单卡', value: 'prioritize_card' },
                    { title: '排除指定单卡 (直接丢弃)', value: 'exclude_card' },
                  ]"
                  label="微调策略"
                  density="compact"
                  variant="outlined"
                  hide-details
                />

                <div
                  v-if="newRuleForm.priorityModifier !== 'none'"
                  class="d-flex flex-wrap ga-2 align-stretch"
                >
                  <v-select
                    v-model="newRuleForm.priorityCard"
                    :items="deckCardSelectItems"
                    label="指定单卡"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="flex-1-1"
                    style="min-width: 220px"
                    :menu-props="{ contentClass: 'themed-scrollbar scrollbar-gutter-auto' }"
                  >
                    <template #selection="{ item }">
                      <div class="d-flex align-center ga-2" style="max-width: 100%; height: 24px">
                        <div class="sim-select-thumb-mini">
                          <v-img :src="item.raw.imageUrl" :aspect-ratio="400 / 559" cover />
                        </div>
                        <span class="text-truncate text-body-2">{{ item.raw.title }}</span>
                      </div>
                    </template>
                    <template #item="{ props: itemProps, item }">
                      <v-list-item
                        v-bind="itemProps"
                        :title="item.raw.title"
                        :subtitle="item.raw.subtitle"
                      >
                        <template #prepend>
                          <div class="sim-select-thumb mr-2">
                            <v-img :src="item.raw.imageUrl" :aspect-ratio="400 / 559" cover />
                          </div>
                        </template>
                      </v-list-item>
                    </template>
                  </v-select>

                  <v-select
                    v-if="newRuleForm.priorityModifier === 'prioritize_card'"
                    v-model="newRuleForm.priorityCount"
                    :items="[1, 2, 3, 4, 5]"
                    label="优先最多"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="flex-1-1"
                    style="min-width: 140px"
                  />
                </div>
              </div>
            </v-card>
          </v-card-text>

          <v-card-actions class="px-4 py-3">
            <v-spacer />
            <v-btn variant="text" @click="showAddRuleModal = false">取消</v-btn>
            <v-btn color="primary" variant="tonal" class="px-4" @click="submitAddRule"
              >确认添加</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, toRef, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useDeckSimulator } from '@/composables/useDeckSimulator'
import { getCardUrls } from '@/utils/getCardImage'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  cards: { type: Object, default: () => ({}) },
  deckName: { type: String, default: '卡组' },
})

const emit = defineEmits(['update:modelValue'])

const { smAndUp } = useDisplay()

const cardsRef = toRef(props, 'cards')
const {
  rules,
  activeRules,
  sampleSize,
  isSimulating,
  singleResult,
  batchResult,
  totalDeckCount,
  cardList,
  addRule,
  removeRule,
  moveRuleUp,
  moveRuleDown,
  resetRules,
  runSingle,
  runBatch,
} = useDeckSimulator(cardsRef)

const activeTab = ref('batch')
const showAddRuleModal = ref(false)

// Add Rule Form
const newRuleForm = ref({
  enabled: true,
  conditionType: 'always',
  conditionCard: null,
  conditionCardKeepCount: 1,
  type: 'level',
  operator: '=',
  levelTarget: 0,
  cardTarget: null,
  cardTypeTarget: '高潮卡',
  limitType: 'at_most',
  limitCount: 3,
  priorityModifier: 'none',
  priorityCard: null,
  priorityCount: 1,
})

const openAddRuleModal = () => {
  const defaultCard = deckCardSelectItems.value[0]?.value || null
  newRuleForm.value = {
    enabled: true,
    conditionType: 'always',
    conditionCard: defaultCard,
    conditionCardKeepCount: 1,
    type: 'level',
    operator: '=',
    levelTarget: 0,
    cardTarget: defaultCard,
    cardTypeTarget: '高潮卡',
    limitType: 'at_most',
    limitCount: 3,
    priorityModifier: 'none',
    priorityCard: defaultCard,
    priorityCount: 1,
  }
  showAddRuleModal.value = true
}

const deckCardSelectItems = computed(() =>
  cardList.value.map((c) => ({
    title: `${c.id}`,
    subtitle: `${c.type} · ×${c.quantity || 1}`,
    value: c.id,
    imageUrl: getCardUrls(c.cardIdPrefix, c.id).base,
  }))
)

// Auto init card target in rule form
watch(
  deckCardSelectItems,
  (items) => {
    if (items.length > 0) {
      if (!newRuleForm.value.cardTarget) newRuleForm.value.cardTarget = items[0].value
      if (!newRuleForm.value.conditionCard) newRuleForm.value.conditionCard = items[0].value
      if (!newRuleForm.value.priorityCard) newRuleForm.value.priorityCard = items[0].value
    }
  },
  { immediate: true }
)

const closeDialog = () => {
  emit('update:modelValue', false)
}

const isCardKept = (handIndex) => {
  if (!singleResult.value) return false
  return singleResult.value.keptIndices?.has(handIndex) ?? false
}

const isRedrawnCard = (idx) => {
  if (!singleResult.value) return false
  return idx >= singleResult.value.keptCards.length
}

const submitAddRule = () => {
  let targetVal
  if (newRuleForm.value.type === 'level') {
    targetVal = newRuleForm.value.levelTarget
  } else if (newRuleForm.value.type === 'specific_card') {
    targetVal = newRuleForm.value.cardTarget
  } else {
    targetVal = newRuleForm.value.cardTypeTarget
  }

  const isNone = newRuleForm.value.limitType === 'none'
  const isAll = newRuleForm.value.limitType === 'all'
  const isAtMost = newRuleForm.value.limitType === 'at_most'

  addRule({
    enabled: true,
    conditionType: newRuleForm.value.conditionType || 'always',
    conditionCard:
      newRuleForm.value.conditionType !== 'always' ? newRuleForm.value.conditionCard : null,
    conditionCardKeepCount:
      newRuleForm.value.conditionType === 'has_card'
        ? Math.max(1, Number(newRuleForm.value.conditionCardKeepCount) || 1)
        : 1,
    type: newRuleForm.value.type,
    operator: newRuleForm.value.operator,
    targetValue: targetVal,
    limitType: newRuleForm.value.limitType,
    limitCount: isNone ? 0 : isAll ? 5 : Math.max(1, Number(newRuleForm.value.limitCount) || 1),
    priorityModifier: isAtMost ? newRuleForm.value.priorityModifier || 'none' : 'none',
    priorityCard:
      isAtMost && newRuleForm.value.priorityModifier !== 'none'
        ? newRuleForm.value.priorityCard
        : null,
    priorityCount:
      isAtMost && newRuleForm.value.priorityModifier === 'prioritize_card'
        ? Math.max(1, Number(newRuleForm.value.priorityCount) || 1)
        : 1,
  })

  showAddRuleModal.value = false
}

const getTargetLabel = (rule) => {
  if (!rule) return ''
  if (rule.type === 'level') {
    const op = rule.operator === '>=' ? '以上' : rule.operator === '<=' ? '以下' : '等'
    return `Lv.${rule.targetValue} ${op}`
  }
  if (rule.type === 'specific_card') {
    return `${rule.targetValue}`
  }
  if (rule.type === 'card_type') {
    return `${rule.targetValue}`
  }
  return '自订'
}

const getPolicyColor = (rule) => {
  if (rule.limitType === 'all') return 'success'
  if (rule.limitType === 'none' || Number(rule.limitCount) === 0) return 'error'
  return 'teal'
}

const getPolicyLabel = (rule) => {
  if (rule.limitType === 'all') return '全部保留'
  if (rule.limitType === 'none' || Number(rule.limitCount) === 0) return '全部丢弃'
  return `保留最多 ${rule.limitCount} 张`
}

const getCardImage = (card) => getCardUrls(card.cardIdPrefix, card.id)

const getTypeChipColor = (type) => {
  if (type === '角色卡') return 'primary'
  if (type === '事件卡') return 'teal'
  if (type === '高潮卡') return 'deep-orange-darken-2'
  return 'blue-grey'
}

const getLevelColor = (level) => {
  const lvl = Number(level)
  if (lvl === 0) return 'amber-darken-2'
  if (lvl === 1) return 'teal-darken-1'
  if (lvl === 2) return 'indigo-darken-1'
  if (lvl === 3) return 'deep-purple-darken-2'
  return 'blue-grey'
}

const getProbTextColor = (prob) => {
  if (prob >= 70) return 'text-success'
  if (prob >= 40) return 'text-primary'
  return 'text-medium-emphasis'
}

const getProbBarColor = (prob) => {
  if (prob >= 70) return 'success'
  if (prob >= 40) return 'primary'
  return 'deep-purple-lighten-1'
}
</script>

<style scoped>
/* ── Section cards & rows: pure background color without any tonal overlay ── */
.sim-section-card {
  background: rgba(var(--v-theme-on-surface), 0.04) !important;
}

.sim-modal-section {
  background: rgba(var(--v-theme-on-surface), 0.035) !important;
  border: 1px solid rgba(var(--v-border-color), 0.08);
}

.sim-stat-row {
  background: rgba(var(--v-theme-on-surface), 0.05);
}

/* ── Card gallery items ── */
.sim-label-small {
  font-size: 10px;
  line-height: 1.3;
}

.lh-tight {
  line-height: 1.3;
}

/* ── Hand card states ── */
.hand-card-item {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.keep-border {
  border-color: rgb(var(--v-theme-success)) !important;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.35);
}

.discard-border {
  border-color: rgb(var(--v-theme-error)) !important;
  box-shadow: 0 0 6px rgba(244, 67, 54, 0.25);
}

.redraw-border {
  border-color: rgb(var(--v-theme-info)) !important;
  box-shadow: 0 0 10px rgba(3, 169, 244, 0.4);
  animation: pulse-glow 2s infinite ease-in-out;
}

@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 6px rgba(3, 169, 244, 0.3);
  }
  50% {
    box-shadow: 0 0 14px rgba(3, 169, 244, 0.65);
  }
}

/* ── Select dropdown card thumbnails ── */
.sim-select-thumb-mini {
  width: 16px;
  height: 22px;
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}

.sim-select-thumb {
  width: 28px;
  height: 39px;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}

/* ── Rule card states & switch ── */
.rule-card-item {
  transition: all 0.2s ease-in-out;
}

.rule-card-disabled {
  opacity: 0.55;
  filter: grayscale(0.4);
}
</style>
