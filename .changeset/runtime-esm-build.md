---
'@hlang-org/runtime': minor
---

Add an ES module build. `import` resolves to `lib/index.mjs`; `require` still
resolves to the CommonJS build in `lib/`, unchanged, and deep `lib/...` imports
keep working through the `exports` map. Vite and other ESM tools no longer need
to convert the runtime from CommonJS.
