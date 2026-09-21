---
trigger: always_on
---

# Code Verification & Formatting Rules

Before declaring any code modification or feature delivery complete, the following verification and formatting steps **MUST** be executed:

1. **Code Rule Verification (Lint)**:
   - Run `npm run lint` to execute Oxlint automatic fixes and rule checks.

2. **Code Formatting (Format)**:
   - Run `npm run fmt` to format all code consistently using Oxfmt.

3. **Multi-Platform Code Verification (As Needed)**:
   - If Rust code (`src-tauri/`) was modified: Run `npm run lint:rust` and `npm run fmt:rust`.
   - If Android / Kotlin code (`gen/android/`) was modified: Run `npm run lint:android` and `npm run fmt:android`.
