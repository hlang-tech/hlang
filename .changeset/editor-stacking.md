---
'@hlang-org/editor-ui': patch
---

The editor shell isolates its stacking context, so the editor's own layers (panels, dock, cheatsheet) never paint above the host page's layers, such as a sticky header the editor scrolls under.
