---
name: ucx-dev-workflow
description: TCGToolWS 项目完整开发与验证流程指南。包含初始化本地环境、卡牌 FlexSearch 索引生成 (build:index)、D1 数据库初始化 (db:init)、代码规范校验与格式化 (oxlint/oxfmt) 以及 Dev Server 启动测试。当需要进行整体代码修改验证、初始化本地开发环境或排查构建/语法错误时激活此技能。
---

# TCGToolWS 开发与验证流程 (Development & Verification Workflow)

本 Skill 旨在指导 AI Agent 或开发者在 TCGToolWS 项目中进行标准化的开发、索引构建、数据库初始化及提交前验证。

---

## 1. 环境准备 (Environment Setup)

在首次运行项目或修改关键环境变量时，遵循以下步骤：

1. **检查与配置环境变量**
   - 确认根目录存在 `.env` 文件（可参考 `.env.dev`）。
   - 确认 `VITE_IMAGE_BASE_URL` 和 `VITE_BLUR_IMAGE_BASE_URL` 指向有效的 CDN 或本地路径。

2. **初始化本地 Cloudflare D1 数据库 (建表与测试账号)** (涉及用户或后端逻辑开发时)

   首先创建数据表结构：

   ```bash
   npm run db:init
   ```

   接着通过交互式脚本创建测试账号：

   ```bash
   npm run db:seed
   ```

   _说明：按照终端提示输入测试邮箱、密码与权限即可，安全且无需硬编码密码。_

---

## 2. 卡牌索引构建 (Card Index Building)

TCGToolWS 使用 **FlexSearch** 提供跨系列的毫秒级卡牌检索。在修改卡牌数据结构、升级依赖或首次启动前必须构建索引：

```bash
npm run build:index
```

- 对应脚本: `scripts/build-card-index.js`
- 产物路径: `src/assets/search-index/` (或生成对应的二进制/json数据)
- 验证方式: 检查构建输出无 Error 信息，且前端卡牌搜索页面可正常加载及检索卡牌。

---

## 3. 代码质量与格式化 (Linting & Formatting)

项目使用 **Oxlint** 与 **Oxfmt** 进行极速代码检查与格式化。在提交代码或完成功能修改前必须执行：

1. **运行代码规范检查**

   ```bash
   npm run lint:check
   ```

   如需自动修复常见代码风格问题：

   ```bash
   npm run lint
   ```

2. **代码自动格式化**
   ```bash
   npm run fmt
   ```

---

## 4. 验证与本地测试 (Verification & Local Testing)

在完成代码修改后，必须通过以下步骤验证功能正确性：

1. **启动本地开发服务器 (Frontend & Worker Hono API)**

   ```bash
   npm run dev
   ```

   - 前端默认服务于 `http://localhost:5173`

2. **打包与生产环境构建验证**

   ```bash
   npm run build
   ```

   - 此命令会自动触发 `build:index` 并调用 `vite build` 验证生产打包无 Vue / JavaScript 编译异常。

---

## 5. 常见问题排查 (Troubleshooting)

- **缺失索引文件错误**: 如果前端提示无法检索卡牌，运行 `npm run build:index` 重建索引。
- **D1 数据库连接异常**: 确保本地运行 `npx wrangler d1` 环境正常，且 `wrangler.jsonc` 配置正确。
- **图片加载失败**: 检查 `.env` 中的 `VITE_IMAGE_BASE_URL` 设置，或者运行 `npm run setup-img` 准备本地图片资源。
