---
'@hlang-org/editor-ui': minor
---

- `NodeSearchTriggers` handlers declare only what they read (`PointerPosition`, `TouchPositions`, `ConnectionEnd`, exported), so React Flow's events fit them and they can be called with plain data. `connectableCandidates` takes any validator with `canLink`.
- The outline thumbnail, the edge role label, and the node search are typed without assertions.
