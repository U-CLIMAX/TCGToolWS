---
trigger: always_on
---

# 提交前验证与构建流 (Verification & Build Rules)

在完成任何代码修改或功能交付前，必须按顺序执行以下验证步骤：

1. **检查与格式化**:
   - 执行 `npm run lint` 进行 Oxlint 代码规则自动修正。
   - 执行 `npm run fmt` 使用 Oxfmt 统一格式化代码。

2. **索引同步** (如涉及卡牌数据或搜索逻辑):
   - 执行 `npm run build:index` 确保 FlexSearch 索引正常生成。

3. **构建测试**:
   - 执行 `npm run build` 验证 Vite 打包输出无语法与构建异常。
