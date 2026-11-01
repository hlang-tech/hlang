---
title: Interpreter
description: Run an IGraph in process, observe errors and activity, and stop it.
group: Language
order: 5
package: interpreter
---

`@hlang-org/interpreter` runs an `IGraph` in the current process. RxJS stays behind its boundary: errors and activity reach you as plain callbacks.

```js file=interpret.mjs
```

```text output=interpret
```

## interpret(graph, deps, options)

| Argument | Contents |
| --- | --- |
| `deps.registry` | A `NodeRegistry` mapping each node `code` to a node class. |
| `deps.createFlow` | Returns a new `Flow`. |
| `options.flowId` | The run's id. Generated when omitted. |
| `options.env` | An environment label passed to nodes. Defaults to `'prod'`. |
| `options.middleware` | An object passed to every node, for services such as a logger. |

The graph goes through `planGraph` first, so an invalid graph throws a `GraphError` before any node is created.

## The execution handle

| Member | Purpose |
| --- | --- |
| `flowId` | The id this run was scoped with. |
| `roots` | The Readable root nodes that were run. |
| `getNode(nodeId)` | The constructed node instance for a `nodeId`. |
| `onError(listener)` | Called with `{ nodeId, error }` for every message on a `@node/error` port. |
| `onActivity(listener)` | Called with `{ nodeId, portId }` each time a node sends on an output port. |
| `dispose()` | Stops the run: fires the stop signal nodes bind to and cancels the interpreter's subscriptions. |

Nodes receive the stop signal as `this.opts.signal`. Bind long-lived work to it, for example `interval(1000).pipe(takeUntil(this.opts.signal.observable))`, so `dispose()` ends it.

> [!NOTE]
> Lumen's live edges are drawn from `onActivity`: each event is one value leaving a port.

The full API is in the [interpreter reference](/docs/api/interpreter).
