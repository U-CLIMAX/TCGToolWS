# TCGToolWS

<p align="center">
  <img src="src/assets/pc_and_ph.webp" alt="TCGToolWS Preview" width="600">
</p>

<p align="center">
  <a href="https://vuejs.org/">
    <img src="https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue 3">
  </a>
  <a href="https://vitejs.dev/">
    <img src="https://img.shields.io/badge/Vite-7.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
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
- [技术亮点](#技术亮点)
- [系统架构](#系统架构)
- [快速开始](#快速开始)
  - [环境变量配置](#环境变量配置)
  - [安装与运行](#安装与运行)
  - [本地数据库初始化](#本地数据库初始化)
- [开发规范](#开发规范)
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

若需测试登录与后端功能，请执行：

1. **初始化本地 D1 数据库**

   ```bash
   npm run db:init
   ```

2. **插入测试管理员账号**

   ```bash
   npx wrangler d1 execute ws-account-db --local --command="INSERT INTO users (id, email, hashed_password, salt, role) VALUES ('f892bf9e-f8c3-4c87-9a9a-1c3bc38547c0', 'admin@example.com', '9d7edc1be25e6ea2227d9b916fb0c0eb8f8d4dd01b3fc06fdb022941aa0b1a27', 'c26f314e-4570-47c1-abb1-712bd7964fb9', 0);"
   ```

   - **账号**: `admin@example.com`
   - **密码**: `12345678`

## 开发规范

- **组件风格**: 统一使用 `<script setup>` 与 Composition API。
- **函数风格**: 优先使用 **箭头函数 (Arrow Functions)**。
- **路径引用**: 使用 `@` 别名指向 `src/` 目录。
- **代码质量**: 提交前请运行 `npm run lint` 和 `npm run format`。

## 免责声明

本项目为非官方粉丝制作工具，与 **Bushiroad (武士道)** 无任何关联。
卡片图片与相关资料版权归 **Bushiroad** 及各版权方所有。
本项目仅供学习与交流使用，严禁用于商业用途。
