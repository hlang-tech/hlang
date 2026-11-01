---
"@hlang-org/runtime": minor
"@hlang-org/interpreter": minor
"@hlang-org/compiler": minor
---

Add `Flow#dispose()` and node teardowns.

`_read`, `_transform`, and `_write` may now return a teardown function. `flow.dispose()` cuts the flow's connections, runs the teardowns of the nodes it started (the last started first; a failing one goes to `onError`), and completes those nodes' ports, which ends every subscription made on them. It is idempotent, safe to call from inside a handler, and `run` throws on a disposed flow. `flow.disposed` reports the state. The new `Teardown` type is exported.

The interpreter's execution handle now calls the flow's `dispose` (when the runtime provides it) on `dispose()`, so node teardowns run and the graph stops delivering. `IRuntimeFlow` gains an optional `dispose`.

A compiled program's `dispose()` does the same: after the stop signal and the `onStop` callbacks, it calls `flow.dispose()` when the runtime provides it, so both backends stop a graph identically.
