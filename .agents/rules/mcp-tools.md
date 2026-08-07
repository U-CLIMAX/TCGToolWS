---
trigger: always_on
---

# MCP 工具与外部文档查阅规范 (MCP Tools Guide)

本项目整合了 `vuetify-mcp`、`mdn` 与 `context7` 三个 Model Context Protocol (MCP) 服务，Agent 在进行前端 UI 开发或第三方库接入时，应优先使用对应的 MCP 工具进行准确的 API 查阅与文档检索。

---

## 1. Vuetify 官方组件库 MCP (`vuetify-mcp`)

用于检索和验证 Vuetify 3 组件语法、Props 属性、Slots、Directives 指令及 API 变更。

### 常用工具及适用场景：

- **`get_component_api_by_version`**: 查阅指定组件（如 `VCard`, `VBtn`, `VDataTable`, `VDialog`）最新的 API 列表与事件绑定。
- **`get_directive_api_by_version`**: 查阅 Vuetify 指令（如 `v-ripple`, `v-intersect`, `v-touch`）的使用方式。
- **`get_installation_guide` / `get_upgrade_guide`**: 获取 Vuetify 3 配置与升级指导。
- **`get_feature_guide`**: 查找 Vuetify 特定功能的主题与样式集成说明。

> **使用原则**：在编写或重构复杂 Vuetify 组件前，若对特定 Component 的 Prop 类型或插槽不确定，应优先调用 `vuetify-mcp` 校验组件规范，禁止捏造不存在的属性。

---

## 2. Context7 实时第三方库文档搜索 (`context7`)

用于实时获取最新的开源库、API、框架及 CLI 工具的高质量权威文档（比通用网页搜索更精准且包含丰富代码示例）。

### 使用流程：

1. **获取 Library ID**:
   调用 `resolve-library-id`，传入 `libraryName` (如 `hono`, `flexsearch`, `pinia`, `vue`) 及具体的 `query` 问题。
2. **检索文档与代码示例**:
   使用返回的 `library ID` (如 `/websites/hono_dev`, `/honojs/hono`) 调用 `query-docs` 获取详细的代码范例与 API 说明。

### 推荐适用场景：

- 查阅 **Hono API** 路由中间件语法。
- 查阅 **FlexSearch** 搜索索引的高级配置与 Context/Document 搜索模式。
- 查阅 **Pinia** 持久化插件或 **Vite 8** 插件配置。

> **使用原则**：当涉及第三方库语法更新、新版 API 接入或跨组件库调试时，优先通过 `context7` 检索最新官方范例。

---

## 3. MDN Web Docs 检索 (`mdn`)

用于快速检索标准的 Web 技术文档（HTML、CSS、JavaScript 及 Web API）。

### 常用工具及适用场景：

- **`search`**: 根据关键词搜索 MDN 上的相关文档条目。
- **`get-doc`**: 查阅特定标准 API（如 `Array.prototype.map`, `IntersectionObserver`, `CSS Grid` 等）的完整规范、语法和代码示例。
- **`get-compat`**: 检查特定 Web 特性在各主流浏览器（Chrome, Safari 等）中的兼容性支持情况。

> **使用原则**：在开发过程中遇到纯 JS API、CSS 属性或原生 DOM 操作，且不确定其语法与浏览器兼容性时，应优先使用 `mdn` 工具进行查阅，确保前端代码符合 Web 标准。
