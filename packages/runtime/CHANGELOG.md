# @hlang-org/runtime

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
