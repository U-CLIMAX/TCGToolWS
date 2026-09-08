/**
 * Detect if running inside a Tauri webview environment.
 * Evaluates without importing any Tauri runtime code to prevent bundling in web builds.
 * @type {boolean}
 */
export const isTauri =
  typeof window !== 'undefined' && Boolean(window.isTauri || window.__TAURI_INTERNALS__)
