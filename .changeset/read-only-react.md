---
"@hlang-org/editor-react": minor
---

Add `useReadOnly(core)`, which follows the editor's read-only mode. A node that is not locked no longer sets React Flow's `draggable` and `selectable` to `true`; it leaves them unset, so the canvas's `nodesDraggable` and `elementsSelectable` decide (a read-only canvas can stop every drag). Locked nodes still set both to `false`.
