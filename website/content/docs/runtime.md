---
title: Nodes and ports
description: The runtime's nodes, ports and flows, and the rules they enforce.
group: Language
order: 3
package: runtime
---

`@hlang-org/runtime` is the engine. It has three node base classes, a `Port` factory and `Flow`.

## Nodes

| Class | Kind | Ports | Implement |
| --- | --- | --- | --- |
| `ReadableNode` | R | outputs, plus `@node/error` | `_read($o)` |
| `TransformNode` | T | inputs and outputs, plus `@node/error` | `_transform($i, $o)` |
| `WriteableNode` | W | inputs only, no error port | `_write($i)` |

Create ports in the constructor with `Port.I(name).attach(this)` and `Port.O(name).attach(this)`. The constructor argument is stored as `this.opts`. The interpreter and the compiler pass `{ nodeId, flowId, env, middleware, config, signal }`; a node's parameters are in `this.opts.config.params`.

The runtime calls `_read`, `_transform` or `_write` once per flow. `$i(name)` and `$o(name)` return the node's input and output ports. Inside a node, `this.I(name)`, `this.O(name)` and `this.E()` (the error port) return the same ports. `I` and `O` throw when the node has no port of that name; `E()` returns `undefined` on a Writable node. Readable and Transform nodes have `throw(error)`, which sends `error` on `@node/error`.

The runtime is typed without `any`. A node's options type is its type argument (`class Scale extends TransformNode<ScaleOptions>`), and messages are `unknown`, so a node narrows what it receives. The [runtime README](https://github.com/hlang-tech/hlang/tree/main/packages/runtime#typescript) has an example and the migration from 1.x.

```js file=lib/nodes.mjs
```

## Ports

A port wraps an RxJS `Subject`.

| Method | Effect |
| --- | --- |
| `send(message)` | Emits `message`. |
| `receive(listener)` | Subscribes `listener` and returns the RxJS `Subscription`. |
| `pipe(...operators)` | Applies RxJS operators to what the port emits and returns `{ receive }`. |
| `connect(input)` | Connects this output port to an input port. Throws unless the direction is output to input. |

Ports are multicast: one output can feed several inputs, and an input can receive from several outputs.

Every connection delivers through one first-in, first-out queue, so the call stack stays at the same depth however long a graph is, no handler is re-entered, and messages on one connection arrive in the order they were sent. A handler that throws never ends its connection: a Transform's error goes to its `@node/error` port, and anything else to the flow's `onError`. A node cannot reach the flow or another node; nodes share only the messages on their connections.

## Flows

`new Flow().run(readable)` collects the nodes reachable from the Readable root. It starts the Writable nodes first, then the Transform nodes, then the root, so every subscriber exists before data is sent. `run` throws if its argument is not a Readable node; run each Readable root of a graph.

A connection can be bounded, as in Flow-Based Programming: `output.connect(input, { capacity: 4 })`. It holds the messages waiting for its input and the ones being worked on; `send` reports whether there is still room, `ready()` waits for room, and `write()` waits and then sends. A handler that returns a promise works on one message at a time when its input is fed by a bounded connection, so a slow consumer slows its producer instead of piling up work. `overflow: "drop-oldest"` drops the oldest waiting message of a full connection instead.

A sender closes its output with `close()` when it has nothing more to send. An input ends once every connection into it has closed and its messages are done, which a receiver handles with `receive(handler, { end })`; a Transform then closes its outputs, so the end travels through the graph, and `await flow.done` resolves when every node has finished.

`new Flow({ slice: {} })` makes a flow share its thread: it delivers for at most `budgetMs` (default 5) per task, then yields and continues in a later task, in the same order. A feedback loop with no asynchronous step then neither freezes a page nor starves a server, and `dispose` can stop it. The cost is one clock read per delivery; synchronous delivery stays the default. The interpreter and compiled programs take the same `slice` option, and the editor slices its runs by default.

`flow.dispose()` ends the nodes the flow started. It cuts the flow's connections, runs the teardowns that `_read`, `_transform` and `_write` may return (a function that clears a timer or closes a socket), the last started first, then completes the nodes' ports, which ends every subscription on them. It can be called more than once and from inside a handler; `run` throws on a disposed flow.

```js file=runtime.mjs
```

```text output=runtime
```

> [!WARNING]
> Transform nodes can form a cycle. Bound a feedback loop, for example with `take` or a counter, so it ends.

The full API is in the [runtime reference](/docs/api/runtime).
