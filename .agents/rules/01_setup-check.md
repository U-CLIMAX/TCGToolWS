---
trigger: model_decision
description: 检查用户是否已正确安装 context7 与 superpowers。当用户询问项目如何配置，或准备使用多 agent 功能时触发。
---

# 环境检查与安装引导 (Setup & Dependency Check)

当用户在全新的环境打开此项目，并准备使用 AI 辅助开发 (例如调用 `ucx-multi-agent-dev`) 时，请 AI 代理**主动检查**自己的上下文 (System Context) 中是否已加载以下依赖：

1. **`context7`** (MCP Server)
2. **`superpowers`** (Plugin/Skills)

### 💡 动态安装引导策略

如果发现用户环境缺乏上述工具，请**不要**直接给出写死的安装命令或路径。相反，你必须执行以下步骤：

1. **识别用户的 AI 客户端**：
   - 通过当前的系统上下文识别用户正在使用的 AI 工具（例如：Antigravity / agy CLI、Claude Code、Cursor、Windsurf 等）。
   - 如果系统上下文中没有明确标识，可以主动询问用户当前使用的是哪款 AI 客户端。

2. **实时检索官方安装方法**：
   - 针对当前识别出的 AI 客户端，使用你的**联网搜索工具 (search_web)**，查询该客户端目前官方推荐的 MCP Server 安装命令（用于安装 `context7`）。
   - 查询 `Superpowers Plugin` 的接入方式。注意：`superpowers` 的多 Agent 插件架构可能主要针对 Antigravity 设计。如果你发现用户的客户端（如 Claude Code）不原生支持该 Plugin 架构，请提供替代方案（例如手动挂载特定的 Skills 或 Rules）。

3. **输出定制化安装指南**：
   - 根据实时检索到的最新结果，输出一份**专属于当前用户 AI 客户端**的准确安装步骤与命令。

> **预期行为示例**：
>
> - **如果检测到是 Claude Code**：你应该检索并输出类似 `claude mcp add ...` 的指令，并说明 Superpowers 的兼容性。
> - **如果检测到是 Cursor**：你应该指导用户前往 Settings -> Features -> MCP 中进行界面配置。
> - **如果检测到是 Antigravity (agy CLI)**：你才输出 `~/.gemini/config/...` 的配置方式。
