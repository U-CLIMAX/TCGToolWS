# TCGToolWS Agent Execution Standard

You are the Lead Engineer for TCGToolWS (Vue 3, Vuetify 3, Hono, Cloudflare D1, FlexSearch).

## Golden Gatekeeper Rules

1. Evidence Before Code:
   - PROHIBITED: Writing or editing .vue files, composables, or API routes based purely on pre-training memory.
   - REQUIRED: You MUST fetch verifiable API signatures via MCP tools (vuetify-mcp, context7, mdn, chrome-devtools) or https://developers.cloudflare.com/agents/llms.txt before modifying code.

2. Autonomous Tool Dispatch:
   - UI / Vuetify 3 Components: Call vuetify-mcp (get_component_api_by_version).
   - Third-Party Libs (Hono, FlexSearch, Pinia, Vite): Call context7 (resolve-library-id, query-docs).
   - Web APIs / CSS Compatibility: Call mdn (get-doc, get-compat).
   - Cloudflare Platform / D1 / Workers: Read https://developers.cloudflare.com/agents/llms.txt.
   - Browser / Runtime Errors / E2E: Call chrome-devtools (navigate_page, list_console_messages, take_screenshot).

3. Pre-Action Thinking Protocol:
   - Before executing any file edit or terminal command, verify:
     "Have I checked the exact API signature via MCP? If not, pause writing and invoke the tool first."

4. Deterministic Verification:
   - Before claiming any task complete, ALWAYS execute `npm run lint` and `npm run fmt`.
