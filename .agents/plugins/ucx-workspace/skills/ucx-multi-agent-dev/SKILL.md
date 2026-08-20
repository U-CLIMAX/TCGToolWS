---
name: ucx-multi-agent-dev
description: 当用户需要实作复杂功能或透过多 Agent 协作流修改 TCGToolWS 项目时，请使用此技能。
---

# UCX 多 Agent 协作开发流 (Multi-Agent Development Workflow)

此技能用于指导如何透过委派任务给专业的子代理 (subagents) 来高效修改 TCGToolWS 项目。

## 可用的专属 Agent 专家

这些 Agent 已经内建在 `ucx-workspace` 插件中，并且它们对各自的领域有着完整的上下文认知：

1. **`ucx_frontend_expert`**:
   - 精通 Vue 3 与 Vuetify 3 的前端专家。
   - 会主动使用 `vuetify-mcp` 确保 UI 组件被完美实作，使用 `mdn` 查询 Web 标准，并在需要时借助 `chrome-devtools` 进行浏览器与 UI 交互核验。
2. **`ucx_backend_expert`**:
   - 精通 Hono、Cloudflare Workers 与 D1 数据库的后端专家。
   - 会主动透过 `context7` 与 Cloudflare `llms.txt` 查阅官方文档。
3. **`ucx_architect`**:
   - 负责规划多 Agent 协作流、验证集成度与强制执行系统规范的主架构师。

## 协作工作流程 (Workflow Steps)

当用户请你实作新功能或修改项目时，你应该遵循以下步骤：

1. **理解需求 (Understand Requirements)**:
   将任务拆解为前端 (UI, Vuetify, Vue components) 与后端 (Hono routes, D1 database, 核心逻辑) 两个部分。
2. **委派任务 (`invoke_subagent`)**:
   同时唤醒 `ucx_frontend_expert` (负责前端任务) 与 `ucx_backend_expert` (负责后端任务)。在 prompt 中给它们极度详尽的指示，告诉它们具体需要实作什么。
3. **验证与整合 (Verify and Integrate)**:
   当专家们完成任务后，你需要验证整体的系统功能。
   使用 `ucx-dev-workflow` 提到的验证步骤 (例如：`npm run lint`, `npm run build`, `npm run build:index`) 来确保没有任何错误。
4. **结果汇报 (Report)**:
   向用户展示最终的实作成果。
