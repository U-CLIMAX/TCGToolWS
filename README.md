# TCGToolWS

<p align="center">
  <img src="src/assets/pc_and_ph.webp" alt="TCGToolWS Preview" width="600">
</p>

<p align="center">
  <a href="https://vuejs.org/">
    <img src="https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue 3">
  </a>
  <a href="https://vitejs.dev/">
    <img src="https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  </a>
  <a href="https://vuetifyjs.com/">
    <img src="https://img.shields.io/badge/Vuetify-3.x-1867C0?style=for-the-badge&logo=vuetify&logoColor=white" alt="Vuetify">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-GPL-blue?style=for-the-badge" alt="License">
  </a>
</p>

<p align="center">
  <strong>专为 Weiss Schwarz (WS) 玩家打造的现代化卡片浏览与卡组管理工具。</strong>
</p>

<p align="center">
  <a href="https://www.uclimax.top">
    <img src="https://img.shields.io/badge/Official_Site-uclimax.top-2ea44f?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Official Site">
  </a>
</p>

## 📖 目录

- [主要功能](#主要功能)
- [系统架构](#系统架构)
- [快速开始](#快速开始)
  - [环境变量配置](#环境变量配置)
  - [安装与运行](#安装与运行)
  - [本地数据库初始化](#本地数据库初始化)
- [AI Agents 与自动化测试](#ai-agents-与自动化测试)
- [开发规范](#开发规范)
- [Credits](#credits)
- [免责声明](#免责声明)

---

## 主要功能

- 🔍 **全局索引搜索**: 基于 FlexSearch 的毫秒级跨系列关键词检索，支持多种过滤维度。
- 🃏 **卡组管理**: 卡组版本管理、导入 DeckLog、生成分享链接等。
- 📄 **多格式导出**: 支持将卡组导出为图片或 PDF（支持打印排版）。
- 📱 **PWA 支持**: 支持安装至移动端桌面。

## 系统架构

| 类别         | 技术 / 套件                                             | 说明                                    |
| :----------- | :------------------------------------------------------ | :-------------------------------------- |
| **前端框架** | [Vue 3](https://vuejs.org/)                             | Composition API + `<script setup>` 语法 |
| **UI 框架**  | [Vuetify 3](https://vuetifyjs.com/)                     | 基于 Material Design 3 的组件库         |
| **状态管理** | [Pinia](https://pinia.vuejs.org/)                       | 支持持久化存储（PersistedState）        |
| **核心引擎** | [FlexSearch](https://github.com/nextapps-de/flexsearch) | 全文搜索引擎                            |
| **后端框架** | [Hono](https://hono.dev/)                               | 轻量级边缘计算 API 框架                 |
| **数据库**   | [Cloudflare D1](https://developers.cloudflare.com/d1/)  | 边缘侧 Serverless SQL 数据库            |

## 快速开始

### 环境变量配置

在根目录创建 `.env` 文件（可参考 `.env.dev`）。

#### 关于图片来源的设定

您可以选择以下两种方式之一来设定图片来源：

1.  **使用URL (推荐)**

直接连结图片库，无需下载大量档案。

```properties
VITE_IMAGE_BASE_URL=https://media.githubusercontent.com/media/U-CLIMAX/ws-image-data/main/ws-image-data
VITE_BLUR_IMAGE_BASE_URL=https://media.githubusercontent.com/media/U-CLIMAX/ws-image-data/main/ws-blur-image-data
```

2.  **使用本地图片**

- 第一步：执行脚本下载图片

```bash
npm run setup-img
```

- 第二步：修改环境变数

```properties
VITE_IMAGE_BASE_URL=ws-image-data
VVITE_BLUR_IMAGE_BASE_URL=ws-blur-image-data
```

### 安装与运行

确保 Node.js 版本 `>= 20.0.0`。

1. **安装依赖**

   ```bash
   npm install
   ```

2. **构建搜索索引** (初次启动必执行)

   ```bash
   npm run build:index
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

### 本地数据库初始化

若需测试登录与后端功能，请按照以下步骤初始化数据库：

1. **创建数据表结构**：

   ```bash
   npm run db:init
   ```

2. **创建本地测试账号**：
   ```bash
   npm run db:seed
   ```
   _说明：按照终端提示输入测试邮箱、密码及权限等级，即可安全地生成测试账号。_

#### 定时任务测试 (Scheduler)

本专案后端包含多个排程任务。若要在本地测试 Scheduler，请参考 Cloudflare 官方文件：
[Testing Cron Triggers Locally](https://developers.cloudflare.com/workers/configuration/cron-triggers/#test-cron-triggers-locally)

您可以在本地 Worker 运行时，透过 curl 加上特定的 `cron` 参数发送请求来手动触发对应的任务：

- **测试每周的数据库清理** (`0 0 * * 7`)：
  ```bash
  curl "http://localhost:5173/cdn-cgi/handler/scheduled?cron=0+0+*+*+7"
  ```

## AI Agents 与自动化测试

本专案深度整合了 Antigravity AI 代理架构与多个自动化脚本，以加速本地开发与测试体验。

### 1. 多代理协作开发模式 (Multi-Agent)

如果您使用支持 Antigravity 的 AI 助手，专案中已内建了 `ucx-workspace` 插件，提供了完整的角色分工：

- **`ucx_architect`**: 主架构师，负责分析需求并派发任务。
- **`ucx_frontend_expert`**: 前端专家，精通 Vue 3、Vuetify 与 Composables 规范。
- **`ucx_backend_expert`**: 后端专家，精通 Hono、Cloudflare D1 与 Webhook 机制。

**如何使用？**
只需在与 AI 助手的对话中自然提出需求，或主动提示：“请使用 `ucx-multi-agent-dev` 技能帮我开发...”，AI 就会自动读取 `.agents/rules` 下的所有设计规范，并唤醒对应的专家进行无缝协作。

### 2. 本地测试与工具脚本

- **创建测试账号 (`npm run db:seed`)**
  交互式界面，输入邮箱、密码和权限等级，即可安全地生成加盐加密 (Scrypt) 后的测试账号。
- **测试爱发电 Webhook (`npm run test:afdian`)**
  在本地服务器启动 (`npm run dev`) 的前提下，执行此脚本可自动模拟：`登录 -> 发起订单 -> 获取订单 UUID -> 触发 Webhook 支付成功回调`。
  _(注意：需确保您的 `.env.dev` 中已配置 `AFDIAN_WEBHOOK_BYPASS_TOKEN=dev_sign_bypass_123`，该安全后门在正式环境会被 Vite 自动剔除)_

## 开发规范

- **组件风格**: 统一使用 `<script setup>` 与 Composition API。
- **函数风格**: 优先使用 **箭头函数 (Arrow Functions)**。
- **路径引用**: 使用 `@` 别名指向 `src/` 目录。
- **代码质量**: 提交前请运行 `npm run lint` 和 `npm run fmt`。

## Credits

- **UI/UX 与美术设计**: Kamomim  
  <img src="https://images.weserv.nl/?url=raw.githubusercontent.com/U-CLIMAX/TCGToolWS/main/image/Kamomim_avatar.jpg&mask=circle" width="120" alt="Kamomim Avatar">
- **卡牌文字翻译**: [Card-缪](https://space.bilibili.com/3546826156280707) & U-CLIMAX项目组

## 免责声明

本项目为非官方粉丝制作工具，与 **Bushiroad (武士道)** 无任何关联。
卡片图片与相关资料版权归 **Bushiroad** 及各版权方所有。
本项目仅供学习与交流使用，严禁用于商业用途。
