---
"@hlang-org/editor-core": minor
"@hlang-org/editor-react": minor
"@hlang-org/editor-ui": minor
---

Bounded connections in the editor (RFC 0001, part 4a).

- editor-core:
  - Edges carry `capacity` and `overflow` (`EdgeBounds`), to and from IGraph.
  - `SetEdgeBoundsCommand` sets them as one undoable step. It refuses values a graph would refuse (`invalid-capacity`).
  - The model gains `updateEdgeBounds`; the event bus gains `edgeChanged`.
  - Pasted snapshots validate the bounds.
- editor-react:
  - Edge data carries the bounds.
  - Edges reflect editor-core's selection (`EdgeViewState`), as nodes do. Before this, a selected edge lost its selection on the next re-render.
  - `edgeChanged` re-derives the view.
- editor-ui:
  - Selecting one connection opens a Connection section in the inspector: whether it is bounded, its capacity, and drop-oldest.
  - A bounded edge carries its capacity in FBP notation (`[4]`, or `[4] drop oldest` in the warning hue).
  - A selected edge is highlighted. Disabled inputs and switches look disabled.
  - New exports: `useEdgeBounds`, `ConnectionInspector`, `boundsFields`, `nextBounds`, `capacityLabel`.
