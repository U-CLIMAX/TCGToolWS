# TCGToolWS Project Guide

## Stack & Layout

- **Frontend (`src/`)**: Vue 3.5 (`<script setup>`), Vuetify 3, UnoCSS, Pinia, FlexSearch, Vite 8.
- **Backend (`backend/`)**: Hono on Cloudflare Workers + Cloudflare D1 (`schema.sql`, `wrangler.jsonc`, `worker-configuration.d.ts`).
- **Native (`src-tauri/`)**: Tauri 2 (Rust + Android/Kotlin under `src-tauri/gen/android/`).
- **Scripts (`scripts/`)**: `build-card-index.js`, `build-card-embeddings.js`, `generate-sitemap.js`, `create-test-user.js`.

## Key Commands

- **Dev / Build**: `npm run dev` | `npm run build` (auto-runs `build:index` & `build:sitemap`) | `npm run build:oss` | `npm run build:tauri` | `npm run build:index`
- **Database**: `npm run db:init` | `npm run db:seed`
- **Verify**: `npm run lint` (oxlint --fix) & `npm run fmt` (oxfmt); if Rust/Android changed, also run `lint:rust`/`fmt:rust` or `lint:android`/`fmt:android`.

## Project Invariants

- **Frontend**:
  - `<script setup>` Composition API only (no Options API); PascalCase components; prefer arrow functions for helpers.
  - Always use `@/` alias for `src/` imports (no deep relative paths).
  - Standardize on Vuetify 3 components; clean up listeners/timers in `onUnmounted`.
  - Use `computed` for derived state; reserve `watch`/`watchEffect` strictly for side effects and document each with a brief comment.
- **Backend**:
  - All D1 queries MUST use parameterized statements (`db.prepare(...).bind(...)`).
  - Sync DB schema changes to `schema.sql` and Worker bindings/env vars to `worker-configuration.d.ts`.
  - Annotate core backend handlers/services with JSDoc `@param {Env} env`.
- **API Verification**:
  - When uncertain about APIs, check `vuetify-mcp` (Vuetify 3), `context7` (Hono/Pinia/FlexSearch/Vite), `mdn` (Web/CSS), `chrome-devtools` (runtime UI debugging), or `https://developers.cloudflare.com/agents/llms.txt` (Workers/D1).
- **Completion Gate**:
  - Run `npm run lint` and `npm run fmt` before declaring code changes complete.
