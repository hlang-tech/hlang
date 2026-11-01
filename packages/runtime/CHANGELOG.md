# @hlang-org/runtime

## 2.1.0

### Minor Changes

- 9c55b75: Bounded connections and back-pressure (RFC 0001, part 1).
  
  - `output.connect(input, { capacity, overflow })` bounds a connection. It holds the messages waiting for its input and the ones the input is still working on.
  - `send()` now returns whether every bounded connection of the port has room. `ready()` resolves when there is room; `write()` waits for it, then sends.
  - A message handler may return a promise; until it settles, the message is still being worked on. A rejected promise is routed as a failure: before, it was an unhandled rejection.
  - `receive(handler, { concurrency })` limits how many messages an input works on at once. An input fed by a bounded connection takes one at a time.
  - `overflow: "drop-oldest"` lets a full connection drop its oldest waiting message; the observer's `dropped` reports it.
  - A fan-out waits for its slowest bounded branch.
  - `FlowDisposedError` rejects pending waits when the flow is disposed.
  
  Unbounded connections deliver exactly as before; an interleaved benchmark measured no difference.
- 1c413f0: End of stream (RFC 0001, part 2).
  
  - `output.close()` says a sender has nothing more to send. Sending on a closed output throws.
  - An input ends once every connection into it has closed and its messages are done, including asynchronous work. `receive(handler, { end })` runs when it does.
  - A Transform closes its outputs when all its inputs have ended (`closesWithInputs = false` opts out), so the end travels through the graph.
  - A node finishes when its inputs have ended and its outputs are closed; its error port then closes.
  - `flow.done` resolves when every node has finished, and rejects with `FlowDisposedError` on dispose.
  - A sliced flow's first slice in each task now always delivers at least one message before its budget counts.
  
  Graphs that never close a port run exactly as before.
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
- a996d1e: Add `Flow#dispose()` and node teardowns.
  
  `_read`, `_transform`, and `_write` may now return a teardown function. `flow.dispose()` cuts the flow's connections, runs the teardowns of the nodes it started (the last started first; a failing one goes to `onError`), and completes those nodes' ports, which ends every subscription made on them. It is idempotent, safe to call from inside a handler, and `run` throws on a disposed flow. `flow.disposed` reports the state. The new `Teardown` type is exported.
  
  The interpreter's execution handle now calls the flow's `dispose` (when the runtime provides it) on `dispose()`, so node teardowns run and the graph stops delivering. `IRuntimeFlow` gains an optional `dispose`.
  
  A compiled program's `dispose()` does the same: after the stop signal and the `onStop` callbacks, it calls `flow.dispose()` when the runtime provides it, so both backends stop a graph identically.
- f8ad2cd: Time-sliced delivery: a flow can share its thread.
  
  - runtime:
    - `new Flow({ slice: { budgetMs?, now?, yieldTo? } })` delivers for at most `budgetMs` (default 5) per task, then yields and continues in a later task, in the same order. A feedback loop with no asynchronous step then neither freezes a page nor starves a server, and `dispose()` stops it.
    - Each flow now has its own delivery queue.
    - `yieldToRuntime` picks `setImmediate`, `MessageChannel` or `setTimeout`, whichever the runtime has.
    - Synchronous delivery stays the default and is unchanged.
  - interpreter: `interpret(graph, deps, { slice })` passes it to the flow; `IRuntimeFlowOptions.slice` is new.
  - compiler: a compiled program's `run({ slice })` does the same.
  - editor-core: `InterpreterGraphRunner` slices runs by default (`{ slice: false }` turns it off), so a graph that loops forever cannot freeze the editor.

## 2.0.0

### Major Changes

- 2088608: Runtime 2: typed without `any`, one ES module, queued delivery, isolated nodes. JavaScript graphs run as before except where noted; see "Migrating from 1.x" in the README.
  
  - **Types**: a node's options type is its type argument (`TransformNode<ScaleOptions>`); messages are `unknown`. `PortAccessor`, `MessageHandler`, `FailureHandler`, `AnyNode`, `NodeOptions`, `FlowOptions`, and `NodeKind` are exported.
  - **Package**: one ES module build; `require` works on Node.js 20.19, 22.12, and later. Deep `lib/...` imports are gone. RxJS 7 is a peer dependency.
  - **Delivery**: every connection delivers through one first-in, first-out queue. Depth is unlimited (a 100,000-node chain runs), handlers are never re-entered, order on one connection is kept, and paths interleave first in, first out instead of depth first. Building a graph is O(nodes + connections).
  - **Failures**: a handler that throws keeps its connection; a Transform's error goes to `@node/error`, anything else to the new `Flow({ onError })`, or is rethrown asynchronously.
  - **Isolation**: nodes cannot reach the flow or other nodes; ports' streams, peers, and owners and flows' wiring records are private; `port.$` is read-only.
  - `I(name)` and `O(name)` throw an error naming a missing port; port names containing a dot resolve; `send` works after `pipe`; `Node` is abstract; ids are no longer recorded for the life of the process.

## 1.1.1

### Patch Changes

- 55d4aa1: Wire every connection between the same two nodes. The flow graph kept one edge per pair of nodes, so when two connections joined the same pair (one output into two inputs of a node, or two outputs of a node into another), only the last one delivered values. Interpreted and compiled programs both run on this engine and now deliver on every connection.

## 1.1.0

### Minor Changes

- 058f4d5: Add an ES module build. `import` resolves to `lib/index.mjs`; `require` still
  resolves to the CommonJS build in `lib/`, unchanged, and deep `lib/...` imports
  keep working through the `exports` map. Vite and other ESM tools no longer need
  to convert the runtime from CommonJS.

### Patch Changes

- 47d9059: Built with TypeScript 6. The CommonJS build now inlines its module interop helpers instead of relying on `tslib`, which is not a dependency of this package. The public API and the type declarations are unchanged.

## 1.0.7

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.

## 1.0.6

### Patch Changes

- ff30f50: Upgrade `uuid` to `^11.1.1`, which resolves the moderate npm audit advisory for `uuid` below 11.1.1 (the runtime only uses `v4` and `validate`, which were not affected). Add `repository`, `bugs`, and corrected `homepage` metadata, a package README, and the LICENSE file. No API or behavior changes.
