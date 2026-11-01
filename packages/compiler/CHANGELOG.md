# @hlang-org/compiler

## 2.2.0

### Minor Changes

- 8c4ec76: Bounded connections in the graph (RFC 0001, part 3).
  
  - ir: `IConnection` takes `capacity` (a positive integer) and `overflow` (`"drop-oldest"`). `planGraph` checks them at run time and carries them into `PlannedConnection`.
  - interpreter: bounded connections pass their capacity and overflow to the runtime (`IRuntimePort.connect` takes `IRuntimeConnectOptions`).
  - compiler: a compiled program connects them the same way.
  
  A parity test runs one bounded graph through both backends and compares the results.
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

### Patch Changes

- Updated dependencies [8c4ec76]
  - @hlang-org/ir@1.1.0

## 2.1.0

### Minor Changes

- 9a8323b: Compiled programs give nodes a frozen copy of the middleware, as the interpreter does, so nodes cannot add to it to share state. The parity tests run typed ES module fixtures in both backends and report through middleware instead of a global.

## 2.0.1

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.
- Updated dependencies [57f7a67]
  - @hlang-org/ir@1.0.1

## 2.0.0

### Major Changes

- c472104: Rewrite the compiler. `compile(graph, { nodes })` now lowers an IGraph through the shared `planGraph` front end, builds an ESTree program, and returns a standalone ES module whose `run(options)` executes the graph with the same semantics as `@hlang-org/interpreter`. `compile` is pure: it writes no files and installs nothing.
  
  Breaking changes from 1.x:
  
  - The default export and `complier` are removed. Import `compile` by name.
  - `build()` no longer writes to the temporary directory or runs `npm install`. Write `result.code` to a file and install `result.imports` with your package manager.
  - Node classes are imported from the modules you map in `options.nodes`, instead of from each node's `runtimeResource`.
  - Generated programs no longer depend on `@hset/xlang-runtime-middleware`, lodash, or child-process IPC. Pass `middleware` to `run()`.
  - The package now ships ESM and CommonJS builds with type declarations.
  
  Version 1.x stays available on npm; `^1.0.0` ranges do not resolve to 2.0.0.
