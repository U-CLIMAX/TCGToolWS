---
trigger: always_on
---

# Frontend Development Rules

1. **Component Style**:
   - All `.vue` Single File Components **MUST** use `<script setup>` with Composition API syntax.
   - Options API is strictly prohibited in production code.

2. **Functions & Naming Conventions**:
   - Prefer **Arrow Functions** for internal logic and helper functions.
   - Component names must use **PascalCase**, adhering to Vue style guides.

3. **Path Aliases**:
   - Always use `@/` alias to reference the `src/` directory. Deep relative imports (e.g., `../../../../components`) are forbidden.

4. **UI & Styling**:
   - Standardize on official **Vuetify 3** components for UI design.

5. **Composables Guidelines (`src/composables/`)**:
   - **Single Responsibility**: Each composable must manage a single cohesive state or business concern.
   - **Minimize Output**: Only return essential `ref`/`computed` and methods; hide internal implementation details.
   - **Scope Cleanup**: Always register cleanup hooks (`onUnmounted`) when binding event listeners (`addEventListener`), timers, or external subscriptions to prevent memory leaks.
   - **Composition Thinking**: Deconstruct complex workflows into modular, reusable base composables.

6. **Reactivity & State Design Principles**:
   - **Single Source of Truth (SSOT)**: Never duplicate or manually mirror identical state across multiple stores/refs.
   - **Single-Layer `computed`**: Prefer flat, direct derivations; avoid deep or circular computed dependency chains.
   - **`watch` for Side Effects Only**: Do not use `watch` for state synchronization (use `computed` instead). Use `watch` strictly for async API calls or external side effects.
   - **Avoid Unnecessary Reactivity**: Do not wrap static constants, read-only data, or derivable values in `ref` / `reactive`.
   - **Document Every `watch`**: Every `watch` / `watchEffect` **MUST** include an explanatory comment detailing its trigger condition and exact side-effect goal.
