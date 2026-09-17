---
trigger: always_on
---

# 代码检查与格式化规范 (Verification & Lint Rules)

在完成任何代码修改或功能交付前，必须执行以下检查与格式化步骤：

1. **代码规则检查 (Lint)**:
   - 执行 `npm run lint` 进行 Oxlint 代码规则自动修正与检查。

2. **代码格式化 (Format)**:
   - 执行 `npm run fmt` 使用 Oxfmt 统一格式化代码。

3. **多平台/多语言代码补充 (按需)**:
   - 若修改了 Rust 相关代码 (`src-tauri/`)：执行 `npm run lint:rust` 与 `npm run fmt:rust`
   - 若修改了 Android / Kotlin 代码 (`gen/android/`)：执行 `npm run lint:android` 与 `npm run fmt:android`
