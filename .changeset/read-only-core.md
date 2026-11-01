---
"@hlang-org/editor-core": minor
---

Add a read-only mode. `createEditorCore({ readOnly: true })`, or `core.mode.setReadOnly(true)` at any time, makes the command service refuse every command (reason `'read-only'`) and history refuse undo and redo, so nothing can change the graph however the request arrives. Selection, view state and running are unaffected. `core.mode` (`IEditorModeService`) reports the mode and emits `modeChanged` when it changes.
