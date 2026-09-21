---
trigger: always_on
---

# Autonomous Tool Dispatch & Development Guide

Upon receiving any request, the Agent **MUST proactively identify task nature and autonomously dispatch specialized tools and skills**. Never wait for user reminders or guess APIs/code behavior.

---

## 1. Autonomous Dispatch Matrix

| Task Context / Keywords                                                                                | Required Tool / Skill                                                         | Execution Protocol                                                                                                                               |
| :----------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vuetify UI / Component Development**<br/>(Buttons, dialogs, tables, icons, styling)                  | `vuetify-mcp`                                                                 | Call `get_component_api_by_version` to verify Props, Slots, and Events, or `get_directive_api_by_version`. Never hallucinate non-existent props. |
| **Third-Party Library Syntax**<br/>(Hono, FlexSearch, Pinia, Vite, etc.)                               | `context7`                                                                    | Call `resolve-library-id` first, then `query-docs` for latest API docs and examples.                                                             |
| **Native Web API / CSS / Browser Compatibility**<br/>(DOM, Web Workers, CSS Grid, etc.)                | `mdn`                                                                         | Call `search` and `get-doc` for standards, or `get-compat` to verify cross-browser support.                                                      |
| **Cloudflare Edge Services**<br/>(Workers, D1, KV, R2, Bindings)                                       | Cloudflare LLMs Entry                                                         | Call `read_url_content` on `https://developers.cloudflare.com/agents/llms.txt`. Never guess undefined APIs.                                      |
| **Frontend Runtime Debugging / E2E Verification**<br/>(Blank screens, interaction bugs, layout issues) | `chrome-devtools`                                                             | Sequentially use `navigate_page`, `list_console_messages`, and `take_screenshot` for visual and log inspection.                                  |
| **Complex / Ambiguous Requirements**<br/>(New features, architectural refactors)                       | `superpowers:brainstorming` + `superpowers:writing-plans`                     | Formulate design options, align requirements, and generate structured step-by-step implementation plan.                                          |
| **Bug Investigation / Test Failures**<br/>(Unexpected behavior, broken logic)                          | `superpowers:systematic-debugging`                                            | Formulate testable hypotheses, trace root causes, and verify fixes before modifying code.                                                        |
| **Subagent Delegation**<br/>(Parallel tasks, background workflows)                                     | `invoke_subagent`                                                             | Select appropriate model tier: `flash_lite` (research/read), `flash` (unit tasks), or `pro` (core refactor).                                     |
| **Task Completion Review**                                                                             | `npm run lint` + `npm run fmt` + `superpowers:verification-before-completion` | Run Oxlint and Oxfmt, verify observable outcomes against requirements before claiming completion.                                                |

---

## 2. Core Guidelines

1. **Evidence Before Assertions**:
   - For all framework (Vuetify, Hono), database (D1), and Web APIs, verify exact signatures via tools first. Never write hallucinated or obsolete code.
2. **Proactive Verification**:
   - Verify UI / route changes with `chrome-devtools` screenshots and console logs instead of assuming frontend state.
3. **Structured Execution**:
   - Use Superpowers workflows (`brainstorming`, `writing-plans`, `systematic-debugging`, `verification-before-completion`) for reliable, high-quality delivery.
