---
'@hlang-org/runtime': major
---

Runtime 2: typed without `any`, one ES module, queued delivery, isolated nodes. JavaScript graphs run as before except where noted; see "Migrating from 1.x" in the README.

- **Types**: a node's options type is its type argument (`TransformNode<ScaleOptions>`); messages are `unknown`. `PortAccessor`, `MessageHandler`, `FailureHandler`, `AnyNode`, `NodeOptions`, `FlowOptions`, and `NodeKind` are exported.
- **Package**: one ES module build; `require` works on Node.js 20.19, 22.12, and later. Deep `lib/...` imports are gone. RxJS 7 is a peer dependency.
- **Delivery**: every connection delivers through one first-in, first-out queue. Depth is unlimited (a 100,000-node chain runs), handlers are never re-entered, order on one connection is kept, and paths interleave first in, first out instead of depth first. Building a graph is O(nodes + connections).
- **Failures**: a handler that throws keeps its connection; a Transform's error goes to `@node/error`, anything else to the new `Flow({ onError })`, or is rethrown asynchronously.
- **Isolation**: nodes cannot reach the flow or other nodes; ports' streams, peers, and owners and flows' wiring records are private; `port.$` is read-only.
- `I(name)` and `O(name)` throw an error naming a missing port; port names containing a dot resolve; `send` works after `pipe`; `Node` is abstract; ids are no longer recorded for the life of the process.
