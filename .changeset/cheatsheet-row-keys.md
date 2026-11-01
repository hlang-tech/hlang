---
'@hlang-org/editor-ui': patch
---

Overlays belong to the editor, not the page:

- `Cheatsheet` is positioned against the canvas region instead of the window, so an editor embedded in a larger page covers only itself.
- The `ToastProvider` stack is positioned against the provider's nearest positioned ancestor instead of the window. A full-window editor looks the same; an embedded editor shows its toasts inside itself.
- `Cheatsheet` rows are keyed by their keys and label together, so two bindings for one action (such as the two ways to pan) no longer trigger React's duplicate-key warning.
