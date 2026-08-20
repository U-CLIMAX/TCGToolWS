---
trigger: always_on
---

# MCP 工具与外部文档查阅规范 (MCP Tools Guide)

本项目整合了 `vuetify-mcp`、`context7`、`mdn` 与 `chrome-devtools` 四个 Model Context Protocol (MCP) 服务，Agent 在进行前端 UI 开发、第三方库接入、文档检索或浏览器交互与测试排错时，应优先使用对应的 MCP 工具进行准确的 API 查阅与自动化调试。

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

---

## 4. Chrome DevTools 浏览器自动化与调试 (`chrome-devtools`)

用于在开发与测试过程中驱动真实/无头 Chrome 浏览器，进行页面交互自动化、UI 状态核验、控制台排错及性能评估。

### 常用工具分类及适用场景：

1. **页面与标签页导航 (Page & Navigation)**:
   - **`new_page` / `close_page`**: 打开或关闭浏览器页面/标签页。
   - **`navigate_page`**: 导航页面至指定 URL（如 `http://localhost:5173`）。
   - **`list_pages` / `select_page`**: 检视并切换当前操作的目标页面。
   - **`resize_page` / `emulate`**: 调整视窗大小或模拟不同移动设备视口、网络与地理位置。

2. **DOM 交互与表单操作 (Interaction & Input)**:
   - **`click` / `hover` / `drag`**: 模拟鼠标点击、悬停与拖曳操作。
   - **`fill` / `fill_form` / `type_text` / `press_key`**: 针对输入框填充数据或触发键盘事件。
   - **`wait_for`**: 等待特定 DOM 元素出现、导航完成或特定文本加载，确保异步数据与 Vue 组件已完全渲染。

3. **视图快照与脚本执行 (Snapshot & Scripting)**:
   - **`take_snapshot`**: 获取当前页面的 DOM 与无障碍树结构，快速理解页面渲染后的元素布局。
   - **`take_screenshot`**: 截取整页或特定组件的视觉渲染截图，便于验证 UI 样式与响应式布局。
   - **`evaluate_script`**: 在页面上下文中直接执行 JavaScript 脚本，获取运行时状态或计算属性。

4. **控制台与网络请求排查 (Console & Network Diagnostics)**:
   - **`list_console_messages` / `get_console_message`**: 抓取浏览器控制台输出的 Logs、Warnings 与 Errors，精准捕获前端运行时未捕获异常或 Vue 警告。
   - **`list_network_requests` / `get_network_request`**: 检视 API 请求（如向后端 Hono API 或 D1 代理发送的请求）的状态码、请求头及响应 Body。

5. **性能审查与内存分析 (Performance & Profiling)**:
   - **`lighthouse_audit`**: 运行 Lighthouse 对页面进行性能、无障碍性与最佳实践评分。
   - **`performance_start_trace` / `performance_stop_trace` / `performance_analyze_insight`**: 采集与分析页面交互或渲染过程中的性能瓶颈。
   - **`take_heapsnapshot`**: 采集内存快照，排查组件销毁未清理导致的内存泄漏。

> **使用原则**：
>
> - 在本地开发服务器（`npm run dev`）启动后，若需端到端（E2E）验证新 UI 功能或复杂表单提交流程，优先使用 `chrome-devtools` 模拟操作与截取快照。
> - 遇到前端白屏或渲染异常时，必须使用 `list_console_messages` 与 `list_network_requests` 检索控制台报错与网络失败原因，严禁凭空盲猜。
> - 在进行 DOM 操作前，应善用 `wait_for` 避免因 Vue 异步渲染尚未就绪导致的元素查找失败。
