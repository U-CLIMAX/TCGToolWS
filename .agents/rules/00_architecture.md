---
trigger: always_on
---

# Project Architecture Overview

Global architecture guide for TCGToolWS. Reference this architecture before making changes to avoid re-analyzing the codebase.

## 1. Tech Stack

- **Frontend**: Vue 3 (Composition API, `<script setup>`), Vite 8
- **UI Framework**: Vuetify 3 (`vite-plugin-vuetify`), UnoCSS
- **State Management**: Pinia (`pinia-plugin-persistedstate`)
- **Search Engine**: FlexSearch (client-side sub-millisecond card retrieval)
- **Backend**: Hono on Cloudflare Workers
- **Database**: Cloudflare D1 (Serverless Edge SQL)

## 2. Directory Structure

- `src/`: Frontend Vue source code
  - `assets/`: Static assets (images, global styles)
  - `components/`: Reusable UI & business components
  - `composables/`: Vue 3 composables (Hooks)
  - `maps/`: Static mapping configurations & datasets
  - `pages/`: Page views matching routes
  - `plugins/`: Third-party plugins (Vuetify, etc.)
  - `router/`: Vue Router configuration
  - `stores/`: Pinia stores
  - `types/`: TypeScript & JSDoc type definitions
  - `utils/`: Shared utilities and helpers
  - `workers/`: Web Workers for computation-heavy tasks
- `backend/`: Hono routes and backend services
- `scripts/`: Dev/build scripts (`build-card-index.js`, `create-test-user.js`)
- `test/`: Automated test scripts and service mocks (`webhook-afdian.js`)
- `schema.sql`: D1 database schema definitions
- `wrangler.jsonc`: Cloudflare Workers / D1 bindings configuration
- `.agents/rules/`: AI agent rules and tool dispatch specifications

## 3. Core Commands & Build Flow

1. `npm run dev`: Start local Vite development server
2. `npm run build:index`: Build FlexSearch card search index (run on card data or search changes)
3. `npm run db:init`: Initialize local D1 database schema
4. `npm run db:seed`: Interactively seed local test accounts
5. `npm run lint` / `npm run fmt`: Run Oxlint / Oxfmt for verification and formatting
6. `npm run build`: Production build (automatically runs `build:index` first)
