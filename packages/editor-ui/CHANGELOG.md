# @hlang-org/editor-ui

## 0.5.0

### Minor Changes

- 287750e: Small screens and read-only editors.
  
  - `PanelHead` and `PanelAction`: a docked panel's header that responds to its own width (a container query). When it is narrow the actions keep their icons and drop their labels, which stay their accessible names and tooltips; narrower still, the status gives way. `RunLog` uses them, and its rows switch to two lines by the log's width rather than the window's. New icons: `FilterIcon`, `FollowIcon`, `ClearIcon`.
  - `ReadOnlyBadge`: says in the toolbar that the graph is view only; in a narrow toolbar it keeps only its lock. The toolbar's brand now gives way before its actions.
  - `CanvasDock` takes `readOnly`, which keeps only the view controls. `ParamForm` takes `disabled`. The inspector, the connection inspector and the position panel disable their fields in a read-only editor, and the node-search triggers open nothing.
  - `NodeInteraction.rename` is optional: without it a node's name cannot be edited in place. Code that calls `useNodeInteraction().rename` must now allow for it being absent.

### Patch Changes

- Updated dependencies [c704c6f]
- Updated dependencies [96777a2]
  - @hlang-org/editor-core@0.4.0
  - @hlang-org/editor-react@0.3.0

## 0.4.0

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
- e22ab14: Observability, from the runtime to the editor.
  
  - runtime: `new Flow({ observer })` reports every delivery (source and target node and port, the message, and how long the target's handlers took) and every handler failure. Without an observer, no clock is read.
  - interpreter: `createFlow(options)` receives the flow options. A Writable node's handler failure now reaches `handle.onError` with its node id. With `trace: true`, `handle.onDelivery` reports every delivery by graph node and port id.
  - compiler: a compiled program reports a Writable's handler failure to `onError` with its node id, as the interpreter does.
  - editor-core: the execution handle gains an optional `onDelivery`; `InterpreterGraphRunner` traces by default (`{ trace: false }` turns it off).
  - editor-ui:
    - Live highlighting is driven by deliveries: each node flashes every time it runs, and only the edge that carried a message lights.
    - New `RunTrace`, `useRunTrace`, `RunLog`, and a Run section in the inspector.
    - `EditorShell`'s footer can be resized (`footerResize`) by pointer, touch, or keyboard.
    - `useFollowScroll` keeps a scrolling list on its newest entry.
- 05928ae: End of stream and drops, live (RFC 0001, part 4b).
  
  - runtime:
    - The observer gains `ended` (an input ended) and `finished` (a node finished).
    - A node whose output closes is now marked finished before anything downstream learns of it.
  - interpreter: a traced run reports `onEnded`, `onFinished` and `onDropped` by graph id.
  - editor-core: the execution handle forwards them.
  - editor-ui:
    - The run log shows ended inputs, finished nodes and dropped messages.
    - The inspector's run statistics count drops and show when a node has finished.
    - A finished node steps back on the canvas.
- 52ac3c0: A Transform may connect to itself.
  
  - editor-core: the connection validator no longer refuses a self-connection. The port directions alone decide, as for any connection, so only a Transform can loop back into itself, as ir and the runtime already allowed. The `self-connection` validation reason is gone.
  - editor-ui: an edge from a node back into itself is drawn as a loop routed around the node: out of the output to the right, under the node, and up into the input from the left, with rounded corners. The route is `selfLoopPath`, with `SELF_LOOP_CLEARANCE` and `SELF_LOOP_RADIUS`.

### Patch Changes

- Updated dependencies [8c4ec76]
- Updated dependencies [827b3cf]
- Updated dependencies [e22ab14]
- Updated dependencies [988e84a]
- Updated dependencies [05928ae]
- Updated dependencies [a996d1e]
- Updated dependencies [52ac3c0]
- Updated dependencies [f8ad2cd]
  - @hlang-org/interpreter@2.1.0
  - @hlang-org/editor-core@0.3.0
  - @hlang-org/editor-react@0.2.0

## 0.3.0

### Minor Changes

- 75c24cb: - `NodeSearchTriggers` handlers declare only what they read (`PointerPosition`, `TouchPositions`, `ConnectionEnd`, exported), so React Flow's events fit them and they can be called with plain data. `connectableCandidates` takes any validator with `canLink`.
  - The outline thumbnail, the edge role label, and the node search are typed without assertions.

### Patch Changes

- 6576790: - The live signal store notifies once per frame however many signals arrive in it. It used to notify synchronously on every signal once its frame loop was running, which cost a pass over every subscriber per message on a busy stream.
  - `TokenName` names every token `tokens.css` declares: the glass, warning, activity, and cost tokens were missing, so `createTheme` could not override them.
- Updated dependencies [75c24cb]
- Updated dependencies [75c24cb]
- Updated dependencies [2088608]
  - @hlang-org/editor-core@0.2.0
  - @hlang-org/editor-react@0.1.2
  - @hlang-org/interpreter@2.0.0

## 0.2.2

### Patch Changes

- 5715ba8: The editor shell isolates its stacking context, so the editor's own layers (panels, dock, cheatsheet) never paint above the host page's layers, such as a sticky header the editor scrolls under.

## 0.2.1

### Patch Changes

- b0d4392: Overlays belong to the editor, not the page:
  
  - `Cheatsheet` is positioned against the canvas region instead of the window, so an editor embedded in a larger page covers only itself.
  - The `ToastProvider` stack is positioned against the provider's nearest positioned ancestor instead of the window. A full-window editor looks the same; an embedded editor shows its toasts inside itself.
  - `Cheatsheet` rows are keyed by their keys and label together, so two bindings for one action (such as the two ways to pan) no longer trigger React's duplicate-key warning.

## 0.2.0

### Minor Changes

- bfe9c97: `useEditorHotkeys` accepts an optional `scope`. When the editor is embedded in a
  larger page, pass a ref to the editor's root element: shortcuts then fire only
  for keystrokes from inside it, so copying page text or pressing Backspace in a
  page control is left to the page. Without `scope`, behavior is unchanged.
  
  The canvas dock adapts to the width of the canvas: on a narrow canvas (a phone,
  or an editor embedded in a page column) it uses tighter spacing, and below
  400px the zoom readout is its one fit-view control.
  
  A pill node can be selected and dragged by its name. The name covers most of
  the capsule, but it used to stop the click from reaching React Flow and opted
  out of dragging, so pressing on it neither selected nor moved the node.
  Double-clicking the name still renames the node.
  
  The tertiary text token `--hl-ink-3` is lighter (`#80858f`), so hints, counts
  and inactive tabs reach a 4.5:1 contrast ratio on every editor surface.

## 0.1.1

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.
- Updated dependencies [57f7a67]
  - @hlang-org/interpreter@1.0.1
  - @hlang-org/editor-core@0.1.1
  - @hlang-org/editor-react@0.1.1
