---
title: IGraph and planning
description: The JSON form of a program, and how planGraph checks it once for both backends.
group: Language
order: 4
package: ir
---

An `IGraph` is a program as data: a list of nodes and a list of connections. `@hlang-org/ir` defines its types and `planGraph`, and has no dependencies.

```js file=lib/graph.mjs
```

Each node has a `nodeId` (unique in the graph), a `code` (the node type a backend resolves), a `name` and a `type`: `'R'`, `'T'` or `'W'`. Parameters go in `bizData.params`. A connection's `Output` is the upstream port and its `Input` is the downstream port. A connection may be bounded, as in Flow-Based Programming: `capacity` (a positive integer) is how many messages it holds, counting the ones its input is still working on, and a sender to a full connection waits; `overflow: "drop-oldest"` drops its oldest waiting message instead.

## planGraph

`planGraph(graph)` checks the graph and returns an `ExecutionPlan`: its nodes, its connections in graph order, and its Readable roots. The interpreter and the compiler both start from this plan, so they apply the same rules.

```js file=plan.mjs
```

```text output=plan
```

## Errors

A graph that breaks a rule throws a `GraphError` with one of these codes:

| Code | Meaning |
| --- | --- |
| `duplicate-node-id` | Two nodes share a `nodeId`. |
| `invalid-node-kind` | A node's `type` is not `R`, `T` or `W`. |
| `unknown-node` | A connection names a node that is not in `nodeList`. |
| `invalid-connection` | A connection leaves a Writable node, enters a Readable node, or targets the `@node/error` port, which is an output; or its `capacity` is not a positive integer, its `overflow` is not `"drop-oldest"`, or it has an `overflow` without a `capacity`. |
| `no-readable-root` | The graph has no Readable node to run from. |

The full API is in the [ir reference](/docs/api/ir).
