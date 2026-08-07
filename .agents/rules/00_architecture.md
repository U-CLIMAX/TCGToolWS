# 项目架构概览 (Project Architecture)

此文件为 TCGToolWS 项目的全局架构指南。请在执行任何修改前参考此架构，避免每次对话重复分析整个项目结构。

## 1. 技术栈 (Tech Stack)

- **前端**: Vue 3 (Composition API, `<script setup>`), Vite 8
- **UI 框架**: Vuetify 3 (基于 `vite-plugin-vuetify`), UnoCSS
- **状态管理**: Pinia (+ pinia-plugin-persistedstate)
- **搜索引擎**: FlexSearch (用于客户端毫秒级全局卡牌检索)
- **后端**: Hono (轻量级 API 框架), 部署于 Cloudflare Workers
- **数据库**: Cloudflare D1 (边缘 SQL Serverless 数据库)

## 2. 目录结构 (Directory Structure)

- `src/`: 前端 Vue 源码目录
  - `assets/`: 静态资源 (图片、全局样式等)
  - `components/`: 可复用的 Vue 基础组件与业务组件
  - `composables/`: Vue 3 组合式 API 函数 (Hooks)
  - `maps/`: 映射配置或静态数据映射文件
  - `pages/`: 页面级 Vue 组件 (路由对应的页面视图)
  - `plugins/`: 第三方插件注册与配置 (如 Vuetify 等)
  - `router/`: Vue Router 路由配置
  - `stores/`: Pinia 状态管理仓库
  - `types/`: 类型定义文件 (TS 类型或 JSDoc 类型)
  - `utils/`: 工具函数与通用逻辑代码
  - `workers/`: Web Workers 后台线程脚本 (处理计算密集型任务)
- `backend/`: 后端 Hono 路由与业务逻辑
- `scripts/`: 开发与构建辅助脚本 (如 `build-card-index.js`, `create-test-user.js`)
- `test/`: 自动化测试与外部服务模拟脚本 (如 `webhook-afdian.js`)
- `schema.sql`: D1 数据库的 Schema 结构定义
- `wrangler.jsonc`: Cloudflare Workers / D1 的本地与线上绑定配置
- `.agents/`: 专属 AI Agent 的行为规范 (Rules)、技能 (Skills) 与多 Agent 插件 (Plugins)

## 3. 核心指令与构建流程 (Build Flow)

1. `npm run dev`: 启动 Vite 本地开发服务器
2. `npm run build:index`: 构建 FlexSearch 卡牌搜索索引 (非常重要，搜索功能变更时需执行)
3. `npm run db:init`: 于本地初始化 D1 数据库 (仅创建数据表)
4. `npm run db:seed`: 交互式创建本地数据库测试账号
5. `npm run lint` / `npm run fmt`: 调用 Oxlint / Oxfmt 进行代码检查与格式化
6. `npm run build`: 执行正式打包 (会自动先执行 `build:index`)
