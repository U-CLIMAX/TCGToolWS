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
  <strong>專為 Weiss Schwarz (WS) 玩家打造的現代化卡片瀏覽與牌組管理工具。</strong>
</p>

<p align="center">
  <a href="https://uclimax.cn">
    <img src="https://img.shields.io/badge/Official_Site-uclimax.cn-2ea44f?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Official Site">
  </a>
</p>

## 📖 目錄

- [專案簡介](#專案簡介)
- [主要功能](#主要功能)
- [系統架構](#系統架構)
- [專案結構](#專案結構)
- [快速開始](#快速開始)
  - [環境變數設定](#環境變數設定)
  - [安裝與執行](#安裝與執行)
- [開發規範](#開發規範)
- [貢獻](#貢獻)
- [免責聲明](#免責聲明)

## 專案簡介

**TCGToolWS** 是一個基於 Vue 構建的網站，旨在提供流暢的 Weiss Schwarz 卡片查詢體驗。透過響應式設計，無論是在桌面電腦還是行動裝置上，都能輕鬆管理您的牌組與瀏覽最新的卡片系列。

## ✨ 主要功能

- **卡片瀏覽**: 快速檢索與瀏覽 WS 全系列卡片資料。
- **牌組管理**: 直觀的介面讓您輕鬆組建、編輯與儲存牌組。
- **全局搜索**: 強大的索引功能，支援跨系列關鍵字搜尋。
- **響應式 UI**: 基於 Vuetify 3 的 Material Design 設計，適配各種螢幕尺寸。

## 系統架構

本專案採用 **Serverless (無伺服器)** 架構：

| 類別           | 技術 / 套件                                                     | 說明                                                |
| :------------- | :-------------------------------------------------------------- | :-------------------------------------------------- |
| **核心架構**   | [Cloudflare Workers](https://workers.cloudflare.com/)           | **(核心)** Serverless 運算環境，處理 API 與後端邏輯 |
| **後端框架**   | [Hono](https://hono.dev/)                                       | 處理 API 路由                                       |
| **資料庫**     | [Cloudflare D1](https://developers.cloudflare.com/d1/)          | 基於邊緣運算的 Serverless SQL 資料庫                |
| **部署工具**   | [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | Cloudflare 專用 CLI，用於本地開發與部署             |
| **前端框架**   | [Vue 3](https://vuejs.org/)                                     | 使用 Composition API 與 `<script setup>` 語法       |
| **建構工具**   | [Vite](https://vitejs.dev/)                                     | 極速的開發伺服器與打包工具                          |
| **UI 框架**    | [Vuetify 3](https://vuetifyjs.com/)                             | 強大的 Vue UI 元件庫                                |
| **狀態管理**   | [Pinia](https://pinia.vuejs.org/)                               | 直觀且輕量的狀態管理庫                              |
| **路由管理**   | [Vue Router](https://router.vuejs.org/)                         | 處理 SPA 頁面導航                                   |
| **程式碼品質** | ESLint + Prettier                                               | 確保程式碼風格一致性與品質                          |

## 專案結構

```text
.
├── backend/            # Cloudflare Workers 後端邏輯 (Hono)
├── public/             # 靜態資源 (圖片、圖示、Manifest)
├── scripts/            # 建構與設定腳本 (索引建立、圖片下載)
├── src/                # 前端原始碼
│   ├── assets/         # 前端靜態資源
│   ├── components/     # Vue 元件
│   ├── composables/    # 組合式函數 (Composables)
│   ├── router/         # 路由設定
│   ├── stores/         # Pinia 狀態管理
│   ├── styles/         # 全域樣式 (CSS/SCSS)
│   └── views/          # 頁面元件
├── .env.dev            # 開發環境變數範本
├── package.json        # 專案依賴與腳本設定
├── vite.config.js      # Vite 設定檔
└── wrangler.jsonc      # Cloudflare Workers 設定檔
```

## 快速開始

### 環境變數設定

在啟動專案前，請先在根目錄建立 `.env` 檔案（可複製 `.env.dev` 作為模板）。

**關鍵變數說明：**

| 變數名稱                   | 描述                          | 範例 / 備註                     |
| :------------------------- | :---------------------------- | :------------------------------ |
| `VITE_IMAGE_BASE_URL`      | **(核心)** 卡片圖片的來源路徑 | 見下方圖片來源詳細說明          |
| `VITE_BLUR_IMAGE_BASE_URL` | **(核心)** 卡片縮圖的來源路徑 | 見下方圖片來源詳細說明          |
| `JWT_SECRET`               | JWT 簽名密鑰                  | **必填** (開發環境可填任意字串) |
| `BREVO_API_KEY`            | Brevo 郵件服務 API Key        | 用於發送系統郵件                |
| `FRONTEND_URL`             | 前端部署網址                  | 用於生成郵件內的連結            |
| `AFDIAN_PUBLIC_KEY`        | 愛發電支付公鑰                | 處理贊助與支付邏輯              |

#### 關於圖片來源的設定

您可以選擇以下兩種方式之一來設定圖片來源：

1.  **使用URL (推薦)**

    直接連結圖片庫，無需下載大量檔案。

    ```properties
    VITE_IMAGE_BASE_URL=https://media.githubusercontent.com/media/U-CLIMAX/ws-image-data/main/ws-image-data
    VITE_BLUR_IMAGE_BASE_URL=https://media.githubusercontent.com/media/U-CLIMAX/ws-image-data/main/ws-blur-image-data
    ```

2.  **使用本地圖片**
    - 第一步：執行腳本下載圖片
      ```bash
      npm run setup-img
      ```
    - 第二步：修改環境變數
      ```properties
      VITE_IMAGE_BASE_URL=ws-image-data
      VITE_BLUR_IMAGE_BASE_URL=ws-blur-image-data
      ```

### 開發環境資料庫設定

若要在本地環境進行登入與權限測試，請依序執行以下步驟：

1.  **初始化本地資料庫**

    ```bash
    npm run db:init
    ```

2.  **建立測試管理員帳號**
    執行以下指令將預設 Admin 帳號寫入本地 D1 資料庫：

    ```bash
    npx wrangler d1 execute ws-account-db --local --command="INSERT INTO users (id, email, hashed_password, salt, role) VALUES ('f892bf9e-f8c3-4c87-9a9a-1c3bc38547c0', 'admin@example.com', '9d7edc1be25e6ea2227d9b916fb0c0eb8f8d4dd01b3fc06fdb022941aa0b1a27', 'c26f314e-4570-47c1-abb1-712bd7964fb9', 0);"
    ```

3.  **登入資訊**
    完成上述步驟後，您可以使用以下資訊登入：
    - **Email**: `admin@example.com`
    - **Password**: `12345678`

> [!IMPORTANT]
> 雖然是測試帳號，但後端仍需要 `JWT_SECRET` 來簽發登入 Token。請確保您的 `.env` 檔案中包含該變數（開發環境可設為任意值，如 `dev_secret`），否則登入將會失敗。

### 安裝與執行

請確保您的環境已安裝 [Node.js](https://nodejs.org/) (建議 v20+)。

1.  **安裝相依套件**

    ```bash
    npm install
    ```

2.  **建立搜尋索引** (初次執行必備)

    ```bash
    npm run build:index
    ```

3.  **啟動開發伺服器**

    ```bash
    npm run dev
    ```

    開啟瀏覽器訪問顯示的 Local URL (預設為 `http://localhost:5173`)。

4.  **建構生產版本**
    ```bash
    npm run build
    ```

### 定時任務測試 (Scheduler)

本專案後端包含排程任務。若要在本地測試 Scheduler，請參考 Cloudflare 官方文件：
[Testing Cron Triggers Locally](https://developers.cloudflare.com/workers/configuration/cron-triggers/#test-cron-triggers-locally)

您可以在本地 Worker 運行時，透過 curl 發送請求來手動觸發：

```bash
curl "http://localhost:5173/cdn-cgi/handler/scheduled"
```

## 開發規範

為了維護程式碼品質，請遵守以下規範：

- **元件風格**: 全面使用 Vue 3 `<script setup>` 單一檔案元件 (SFC)。
- **函式風格**:
  - 統一使用 **箭頭函式 (Arrow Functions)** 定義方法。
  - 例：`const handleClick = () => { ... }` 而非 `function handleClick() { ... }`。
- **路徑引用**: 使用 `@` 作為 `src/` 目錄的別名 (例: `import Foo from '@/components/Foo.vue'`)。
- **格式化與檢查**:
  提交程式碼前，請務必執行以下指令確保通過檢查：

  ```bash
  # 格式化程式碼 (Prettier)
  npm run format

  # 語法檢查與自動修正 (ESLint)
  npm run lint
  ```

## 貢獻

歡迎提交 Pull Request 或 Issue！
在提交 PR 前，請確保：

1. 已執行 `npm run format` 與 `npm run lint`。
2. 新功能需附上簡單的測試或截圖說明。

## 免責聲明

本專案為非官方粉絲製作工具，與 **Bushiroad** 無任何關聯。
卡片圖片與資料版權歸 **Bushiroad** 及各相關版權方所有。
本專案僅供學習與交流使用，請勿用於商業用途。
