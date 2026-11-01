---
"@hlang-org/editor-ui": minor
---

Small screens and read-only editors.

- `PanelHead` and `PanelAction`: a docked panel's header that responds to its own width (a container query). When it is narrow the actions keep their icons and drop their labels, which stay their accessible names and tooltips; narrower still, the status gives way. `RunLog` uses them, and its rows switch to two lines by the log's width rather than the window's. New icons: `FilterIcon`, `FollowIcon`, `ClearIcon`.
- `ReadOnlyBadge`: says in the toolbar that the graph is view only; in a narrow toolbar it keeps only its lock. The toolbar's brand now gives way before its actions.
- `CanvasDock` takes `readOnly`, which keeps only the view controls. `ParamForm` takes `disabled`. The inspector, the connection inspector and the position panel disable their fields in a read-only editor, and the node-search triggers open nothing.
- `NodeInteraction.rename` is optional: without it a node's name cannot be edited in place. Code that calls `useNodeInteraction().rename` must now allow for it being absent.
