---
trigger: always_on
---

# Backend API & Database Rules

1. **Hono Route Organization**:
   - Keep backend routes modular and organized by business domain under `backend/`.
   - All API responses must return standard JSON payloads with proper HTTP status codes.

2. **Cloudflare D1 Database**:
   - All database queries **MUST** use parameterized statements (e.g. `db.prepare(...).bind(...)`) to eliminate SQL injection risks.
   - Any database schema changes must be synchronized with [`schema.sql`](file:///D:/Code/web/TCGToolWS/schema.sql).

3. **Types & Bindings**:
   - When adding Cloudflare Worker bindings or environment variables, update [`worker-configuration.d.ts`](file:///D:/Code/web/TCGToolWS/worker-configuration.d.ts).
   - **All backend core functions (Scheduled Handlers, Services, etc.) MUST include standard JSDoc annotations** (specifically typing `@param {Env} env`) to ensure proper Cloudflare type inference and IDE autocompletion.

4. **Cloudflare Documentation**:
   - For all Cloudflare platform APIs (Workers, D1, KV, R2, etc.), **MUST** read and parse `https://developers.cloudflare.com/agents/llms.txt` directly. Never guess unverified APIs.
