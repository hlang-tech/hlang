# @hlang-org/editor-core

## 0.4.0

### Minor Changes

- c704c6f: Add a read-only mode. `createEditorCore({ readOnly: true })`, or `core.mode.setReadOnly(true)` at any time, makes the command service refuse every command (reason `'read-only'`) and history refuse undo and redo, so nothing can change the graph however the request arrives. Selection, view state and running are unaffected. `core.mode` (`IEditorModeService`) reports the mode and emits `modeChanged` when it changes.

## 0.3.0

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
- 988e84a: Messages are immutable values (RFC 0001, part 5).
  
  - runtime: `new Flow({ freezeMessages: true })` deep-freezes the plain objects and arrays in each message as it is sent. A node that mutates what it received fails at once, in its own handler, and the other branches of a fan-out keep what was sent. It is off by default.
  - interpreter: `interpret(graph, deps, { freezeMessages })`.
  - compiler: compiled `run({ freezeMessages })`.
  - editor-core: `InterpreterGraphRunner` freezes messages by default (`freezeMessages: false` turns it off).
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
- f8ad2cd: Time-sliced delivery: a flow can share its thread.
  
  - runtime:
    - `new Flow({ slice: { budgetMs?, now?, yieldTo? } })` delivers for at most `budgetMs` (default 5) per task, then yields and continues in a later task, in the same order. A feedback loop with no asynchronous step then neither freezes a page nor starves a server, and `dispose()` stops it.
    - Each flow now has its own delivery queue.
    - `yieldToRuntime` picks `setImmediate`, `MessageChannel` or `setTimeout`, whichever the runtime has.
    - Synchronous delivery stays the default and is unchanged.
  - interpreter: `interpret(graph, deps, { slice })` passes it to the flow; `IRuntimeFlowOptions.slice` is new.
  - compiler: a compiled program's `run({ slice })` does the same.
  - editor-core: `InterpreterGraphRunner` slices runs by default (`{ slice: false }` turns it off), so a graph that loops forever cannot freeze the editor.

### Patch Changes

- Updated dependencies [8c4ec76]
- Updated dependencies [e22ab14]
- Updated dependencies [988e84a]
- Updated dependencies [05928ae]
- Updated dependencies [a996d1e]
- Updated dependencies [f8ad2cd]
  - @hlang-org/ir@1.1.0
  - @hlang-org/interpreter@2.1.0

## 0.2.0

### Minor Changes

- 75c24cb: - `parseGraphSnapshot(value)` reads a graph snapshot from untrusted data (the clipboard, a file) and returns `null` unless every node and edge is valid.
  - `createDecorator` throws when a service name already has an identifier in the same module instance, instead of returning the existing identifier under a possibly different type. `ServiceIdentifier.type` is an optional phantom.
  - Dependency metadata, identifiers, and the event bus are typed without assertions; the container keeps its two documented unchecked steps (looking an instance up by name, and passing injected arguments to a constructor).

### Patch Changes

- Updated dependencies [2088608]
  - @hlang-org/interpreter@2.0.0

## 0.1.1

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.
- Updated dependencies [57f7a67]
  - @hlang-org/ir@1.0.1
  - @hlang-org/interpreter@1.0.1
