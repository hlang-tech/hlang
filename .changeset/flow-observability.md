---
"@hlang-org/runtime": minor
"@hlang-org/interpreter": minor
"@hlang-org/compiler": minor
"@hlang-org/editor-core": minor
"@hlang-org/editor-ui": minor
---

Observability, from the runtime to the editor.

- runtime: `new Flow({ observer })` reports every delivery (source and target node and port, the message, and how long the target's handlers took) and every handler failure. Without an observer, no clock is read.
- interpreter: `createFlow(options)` receives the flow options. A Writable node's handler failure now reaches `handle.onError` with its node id. With `trace: true`, `handle.onDelivery` reports every delivery by graph node and port id.
- compiler: a compiled program reports a Writable's handler failure to `onError` with its node id, as the interpreter does.
- editor-core: the execution handle gains an optional `onDelivery`; `InterpreterGraphRunner` traces by default (`{ trace: false }` turns it off).
- editor-ui:
  - Live highlighting is driven by deliveries: each node flashes every time it runs, and only the edge that carried a message lights.
  - New `RunTrace`, `useRunTrace`, `RunLog`, and a Run section in the inspector.
  - `EditorShell`'s footer can be resized (`footerResize`) by pointer, touch, or keyboard.
  - `useFollowScroll` keeps a scrolling list on its newest entry.
