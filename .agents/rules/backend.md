---
trigger: always_on
---

# 后端 API 与数据库规范 (Backend & Database Rules)

1. **Hono 路由组织**:
   - 后端路由需保持模块化，按业务逻辑划分在 `backend/` 目录下。
   - 所有的 API 响应须统一返回 JSON 格式及标准 HTTP 状态码。

2. **Cloudflare D1 数据库**:
   - 所有数据库查询必须使用参数化绑定语句（如 `db.prepare(...).bind(...)`），杜绝 SQL 注入风险。
   - 数据库 Schema 的修改必须同步更新根目录下的 [`schema.sql`](file:///C:/Users/ASUS/Code/web/TCGToolWS/schema.sql)。

3. **类型与绑定**:
   - 新增 Cloudflare Worker 绑定（Bindings）或环境变量时，需同步更新 [`worker-configuration.d.ts`](file:///C:/Users/ASUS/Code/web/TCGToolWS/worker-configuration.d.ts)。

4. **Cloudflare 官方文档查阅 (CF Docs)**:
   - 对于所有与 Cloudflare (Workers, D1, KV, R2 等) 相关的开发与 API 说明，代理程序 (Agent) **必须直接读取并解析**专属的 LLM 优化文档入口：`https://developers.cloudflare.com/agents/llms.txt`，以此来搜索最新规范，禁止盲目猜测。
