# @hlang-org/editor-react

## 0.2.0

### Minor Changes

- 827b3cf: Bounded connections in the editor (RFC 0001, part 4a).
  
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

### Patch Changes

- Updated dependencies [827b3cf]
- Updated dependencies [e22ab14]
- Updated dependencies [988e84a]
- Updated dependencies [05928ae]
- Updated dependencies [52ac3c0]
- Updated dependencies [f8ad2cd]
  - @hlang-org/editor-core@0.3.0

## 0.1.2

### Patch Changes

- 75c24cb: Paste validates what it reads from the system clipboard. A tagged clipboard envelope used to be trusted as it was, so text from another program could add nodes the editor cannot handle; now every node and edge must be valid, or the clipboard is ignored.
- Updated dependencies [75c24cb]
  - @hlang-org/editor-core@0.2.0

## 0.1.1

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.
- Updated dependencies [57f7a67]
  - @hlang-org/editor-core@0.1.1
