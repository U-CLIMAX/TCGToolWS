---
trigger: always_on
---

# 前端开发规范 (Frontend Rules)

1. **组件风格**:
   - 所有 `.vue` 单文件组件必须统一使用 `<script setup>` 与 Composition API 语法。
   - 禁止在生产代码中使用 Options API 结构。

2. **函数与命名约定**:
   - 内部逻辑与辅助函数优先使用 **箭头函数 (Arrow Functions)**。
   - 组件名称采用大驼峰 (PascalCase)，文件命名与 Vue 规范保持一致。

3. **路径别名**:
   - 模块导入统一使用 `@/` 指向 `src/` 根目录，严禁使用层级过深的相对路径（如 `../../../../components`）。

4. **UI 与样式规范**:
   - 组件设计优先采用 Vuetify 3 官方组件库。

5. **Composables (组合式函数) 开发规范**:
   在编写或重构 `src/composables/` 目录下的逻辑时，必须严格遵守以下四点准则：
   - **单一职责 (Single Responsibility)**：每个 Composable 应当只负责处理一个核心业务逻辑或状态片段，避免将其膨胀为大杂烩。
   - **输出最小化 (Minimize Output)**：只 `return` 外部真正需要用到的 `ref`/`computed` 和方法，将内部实现细节和中间变量封装隐藏。
   - **作用域清理 (Scope Cleanup)**：若在 Composable 中绑定了事件监听 (`addEventListener`)、定时器或外部订阅，必须主动使用 `onUnmounted` 等生命周期钩子进行清理，以防止内存泄漏。
   - **组合思维 (Composition Thinking)**：复杂的业务逻辑应拆解为多个基础的 Composables，通过相互嵌套与组合来构建最终功能，确保代码的高复用性与可测试性。
