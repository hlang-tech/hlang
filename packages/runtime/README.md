<p align="center">
  <img src="https://raw.githubusercontent.com/hlang-tech/hlang/main/media/brand/packages/runtime.png" alt="hlang runtime" width="100%">
</p>

# @hlang-org/runtime

The hlang runtime: flow-based programming on RxJS streams. Build programs from Readable, Transform, and Writable nodes connected through named ports.

[![npm](https://img.shields.io/npm/v/@hlang-org/runtime?color=c8ccd4&labelColor=0f1114)](https://www.npmjs.com/package/@hlang-org/runtime)
[![license](https://img.shields.io/npm/l/@hlang-org/runtime?color=c8ccd4&labelColor=0f1114)](https://github.com/hlang-tech/hlang/blob/main/LICENSE)

## Install

```sh
npm install @hlang-org/runtime rxjs
```

The same build is published as `@hlang-tech/runtime`. It is one ES module with type declarations; `import` works everywhere, and `require` works on Node.js 20.19, 22.12, and later. RxJS 7 is a peer dependency, so a program holds one copy of each.

## Example

```js
const { Flow, ReadableNode, TransformNode, WriteableNode, Port } = require('@hlang-org/runtime');

class Numbers extends ReadableNode {
  constructor(opts) {
    super(opts);
    Port.O('out').attach(this);
  }
  _read($o) {
    [1, 2, 3].forEach((n) => $o('out').send(n));
  }
}

class Double extends TransformNode {
  constructor(opts) {
    super(opts);
    Port.I('in').attach(this);
    Port.O('out').attach(this);
  }
  _transform($i, $o) {
    $i('in').receive((n) => $o('out').send(n * 2));
  }
}

class Log extends WriteableNode {
  constructor(opts) {
    super(opts);
    Port.I('in').attach(this);
  }
  _write($i) {
    $i('in').receive((n) => console.log(n));
  }
}

const numbers = new Numbers();
const double = new Double();
const log = new Log();

numbers.O('out').connect(double.I('in'));
double.O('out').connect(log.I('in'));

new Flow().run(numbers); // 2, 4, 6
```

## Nodes

| Class | Kind | Ports | Implement |
| --- | --- | --- | --- |
| `ReadableNode` | R, a source | outputs, plus `@node/error` | `_read($o)` |
| `TransformNode` | T | inputs and outputs, plus `@node/error` | `_transform($i, $o)` |
| `WriteableNode` | W, a sink | inputs only, no error port | `_write($i)` |

Create ports in the constructor with `Port.I(name).attach(this)` and `Port.O(name).attach(this)`. A node can have any number of named ports. The constructor argument is stored as `this.opts`. The interpreter and the compiler pass `{ nodeId, flowId, env, middleware, config, signal }`, and node parameters are in `this.opts.config.params`.

The runtime calls `_read`, `_transform`, or `_write` once per flow. `$i(name)` and `$o(name)` return the node's input and output ports. Inside a node, `this.I(name)`, `this.O(name)`, and `this.E()` (the error port) return the same ports. `I` and `O` throw when the node has no port of that name; `E()` returns `undefined` on a Writable node.

Readable and Transform nodes have `throw(error)`, which sends `error` on `@node/error`.

## Ports

A port wraps an RxJS `Subject`.

| Method | Effect |
| --- | --- |
| `send(message)` | Emits `message` (`next`). |
| `receive(listener)` | Subscribes `listener`. Returns the RxJS `Subscription`. |
| `pipe(...operators)` | Applies RxJS operators to what the port emits. Returns `{ receive }`. |
| `connect(input)` | Connects this output port to an input port. Throws unless the direction is output to input. |

Ports are multicast: one output can feed several inputs, and an input can receive from several outputs.

## Delivery and failures

Every connection delivers through one first-in, first-out queue, drained by a single loop. A message a node sends while handling another is queued rather than delivered in a nested call, so:

- the call stack stays at the same depth however long a graph is: a chain of 100,000 nodes runs like a chain of two;
- no handler is re-entered: each delivery finishes before the next starts;
- messages on one connection arrive in the order they were sent. Across connections the order is deterministic (first in, first out), but a program should not depend on it, as in any flow-based program.

A message sent from outside a delivery, such as a source starting or a timer firing, is fully delivered before `send` returns, so a flow is still synchronous from the outside.

A handler that throws never ends its connection; later messages are still delivered. On a Transform's input, the error is sent on the node's `@node/error` port. Anywhere else (a Writable has no error port), it goes to the flow's `onError`, or is rethrown asynchronously when the flow has none:

```ts
new Flow({ onError: (error, node) => report(error, node?.id) }).run(source);
```

A node holds its own options and ports and nothing else: it cannot reach the flow that runs it or another node, and a port's stream, peers, and owner are private. Nodes share only the messages on their connections.

## Flows

`new Flow().run(readable)` collects the nodes reachable from the Readable root through its connections. It starts the Writable nodes first, then the Transform nodes, then the Readable root, so every subscriber exists before data is sent. Run each Readable root of a graph. `run` throws if its argument is not a Readable node.

Transform nodes can form cycles, so a graph can contain feedback loops. Bound a feedback loop, for example with `take` or a counter, so it ends.

### Back-pressure: bounded connections

A connection can have a capacity, as connections do in Flow-Based Programming ([RFC 0001](../../rfcs/0001-bounded-connections.md)). It holds the messages waiting for its input and the ones the input is still working on; when it is full, the sender waits.

```ts
source.O("frames").connect(encoder.I("frames"), { capacity: 4 });

// In the source: wait for room before each frame (FBP's suspending send).
await $o("frames").write(frame);

// Or the non-blocking form, as with Node.js streams.
if (!$o("frames").send(frame)) {
  await $o("frames").ready();
}

// In the encoder: a handler that returns a promise works on one frame at a
// time; the next one waits in the connection until this one is done.
$i("frames").receive(async (frame) => {
  await encode(frame);
});
```

- `send` returns whether every bounded connection of the port still has room. It accepts the message either way; `ready()` resolves when there is room again, and `write()` waits for it, then sends.
- A handler may return a promise; until it settles, the message counts against its connection. A rejected promise is a failure, routed like a throw (a Transform's error port, otherwise `onError`).
- An input fed by a bounded connection works on one message at a time. `receive(handler, { concurrency: n })` sets another limit, bounded or not.
- `{ capacity, overflow: "drop-oldest" }` drops the oldest waiting message of a full connection instead of holding more (JavaFBP's `dropOldest`); the observer's `dropped` reports each one. A message being worked on is never dropped.
- When one output feeds several bounded connections, it waits for the slowest.
- Disposing the flow rejects pending `ready()` and `write()` with `FlowDisposedError`.
- An unbounded connection into an input without a concurrency limit delivers exactly as before, at the same speed.

### End of stream

A sender can say it has nothing more to send, and a flow knows when it has finished ([RFC 0001](../../rfcs/0001-bounded-connections.md)), as in Flow-Based Programming:

```ts
// A source that has sent everything closes its output.
override _read($o) {
  for (const value of values) $o("out").send(value);
  $o("out").close();
}

// A node acts on the end of its input: a total, once all numbers are in.
$i("in").receive((value) => { total += value; }, {
  end: () => $o("out").send(total),
});

await flow.done; // every node has finished
```

- An input ends once every connection into it has closed and its messages are done, including asynchronous work. Messages sent before a close are delivered first.
- A Transform closes its outputs when all its inputs have ended, so the end travels through the graph. A node that keeps producing after its inputs end sets `closesWithInputs = false` and closes its outputs itself.
- A node finishes when its inputs have ended and its outputs are closed; its error port then closes too. `flow.done` resolves when every node has finished, and rejects with `FlowDisposedError` if the flow is disposed first.
- Sending on a closed output throws.
- The observer's `ended` and `finished` report each input that ends and each node that finishes; `dropped` reports each message a `drop-oldest` connection drops.
- A node in a feedback loop is one of its own senders, so its input does not end by itself: as in JavaFBP, a loop ends when one of its nodes closes its output.

### Messages are immutable values

Messages move between nodes without being copied, and one output can feed several inputs, so every branch receives the same object. A node therefore never mutates a message it received: it sends a new value instead, as with React and Redux state ([RFC 0001](../../rfcs/0001-bounded-connections.md)).

`new Flow({ freezeMessages: true })` enforces this: the plain objects and arrays in each message are deep-frozen as they are sent, so a node that mutates what it received fails at once, in its own handler, and the other branches keep what was sent. It costs a walk of each message, so it is off by default; the editor turns it on. Typed arrays, buffers, maps, sets and class instances are not frozen; the rule applies to them all the same.

### Sharing the thread

By default a flow delivers everything a send causes before the send returns. That is the fastest way to run, but work that never ends by itself, such as a feedback loop between Transforms with no asynchronous step (feedback is legal), then holds the thread for good: a page freezes, a server stops answering, and nothing can call `dispose`.

`slice` makes the flow share the thread, as React's scheduler does: it delivers for at most `budgetMs` (default 5) per task, then yields and carries on in a later task, in the same order.

```ts
const flow = new Flow({ slice: {} }); // or { budgetMs: 2 }
flow.run(source);
// The loop runs in slices; the rest of the program keeps running, and this stops it.
flow.dispose();
```

- The budget belongs to a task, not to one send: a source that sends a million values in one loop has its later values queued for the next slices.
- Order is unchanged: messages on a connection arrive in the order they were sent, and messages sent while a flow is paused wait their turn.
- Each flow has its own queue, so a paused flow never holds up another.
- The next slice runs in a macrotask in any JavaScript runtime: `setImmediate` in Node.js and Bun, a `MessageChannel` message in browsers, Deno, and workers, `setTimeout` otherwise. Pass `yieldTo` (and `now`) to choose another.
- The cost is one clock read per delivery, measured at 28 ns on Node.js 24. With handlers that do almost nothing (`value + 1`), throughput was 21% lower than synchronous delivery; the share falls as handlers do real work. Synchronous delivery, the default, is unchanged.

### Stopping a flow

A flow owns the nodes it starts, and `flow.dispose()` ends them. `_read`, `_transform`, and `_write` may return a teardown: a function that releases what the node acquired, such as a timer or a socket. `dispose`:

1. cuts the flow's connections, so nothing more is delivered (messages already queued are dropped);
2. runs each node's teardown once, the last started first. A teardown that throws goes to `onError` (or is rethrown asynchronously), and the others still run;
3. completes every port of those nodes, which ends each subscription made on them; later sends are dropped.

```ts
class Ticker extends ReadableNode {
  constructor() {
    super({});
    Port.O("tick").attach(this);
  }

  override _read($o: PortAccessor): Teardown {
    const timer = setInterval(() => $o("tick").send(Date.now()), 1000);
    return () => clearInterval(timer);
  }
}

const flow = new Flow();
flow.run(ticker);
// later
flow.dispose();
```

`dispose` can be called more than once and from inside a handler. `flow.disposed` tells whether it has been called, and `run` throws on a disposed flow. Nodes started by another flow are left running.

## TypeScript

The package is typed without `any`.

- A node's options type is its type argument: `class Scale extends TransformNode<ScaleOptions>` types `this.opts` as `ScaleOptions`. Without one, `this.opts` is `Readonly<Record<string, unknown>>`.
- Messages are `unknown`. A graph is wired at run time, so a node narrows what it receives before it uses it.
- `PortAccessor` is the type of `$i` and `$o`, `MessageHandler` the type of a `receive` listener, and `AnyNode` a node of any of the three kinds.

```ts
import { Port, TransformNode } from '@hlang-org/runtime';
import type { PortAccessor } from '@hlang-org/runtime';

interface ScaleOptions {
  readonly factor: number;
}

class Scale extends TransformNode<ScaleOptions> {
  constructor(opts: ScaleOptions) {
    super(opts);
    Port.I('in').attach(this);
    Port.O('out').attach(this);
  }

  override _transform($i: PortAccessor, $o: PortAccessor): void {
    $i('in').receive((value) => {
      if (typeof value === 'number') {
        $o('out').send(value * this.opts.factor);
      }
    });
  }
}
```

## Migrating from 1.x

Version 2 changes the package format, the types, and how messages are delivered.

| 1.x | 2.x |
| --- | --- |
| `opts`, messages, and several fields were typed `any`. | `opts` is the node's type argument and messages are `unknown`: declare the options type and narrow received messages. With `noImplicitOverride`, mark `_read`, `_transform`, and `_write` with `override`. |
| `I(name)` and `O(name)` returned `undefined` for a missing port, which failed later on use. | They throw an error that names the node and the port. |
| A port name containing a dot could not be resolved. | Any port name resolves. |
| `send` on a port with a `pipe` threw. | `send` emits; receivers get the piped stream. |
| `Node` could be constructed directly. | `Node` is abstract: extend `ReadableNode`, `TransformNode`, or `WriteableNode`. |
| CommonJS and ES module builds; deep `@hlang-org/runtime/lib/...` imports. | One ES module; import from `@hlang-org/runtime` only. `require` needs Node.js 20.19, 22.12, or later. |
| RxJS 6 was a dependency. | RxJS 7 is a peer dependency: install `rxjs` next to the runtime, and import operators from `rxjs`. |
| A send delivered recursively: downstream had run when `send` returned, deep graphs overflowed the stack, and paths interleaved depth first. | Delivery is queued: inside a handler, downstream runs after it returns; depth is unlimited; paths interleave first in, first out. Order on one connection is kept. |
| A handler that threw ended its connection and was reported as an uncaught error. | The connection stays; a Transform's error goes to `@node/error`, others to `Flow`'s `onError`. |
| `node.flow`, `node.portMap`, `port.peers`, `port.node`, `port.$eventEmitter`, and `flow.cache` were public. | They are private. `port.$` is read-only. |
| `Flow` took any options record. | `Flow` takes `{ onError }`. |

## Related packages

- [`@hlang-org/interpreter`](https://www.npmjs.com/package/@hlang-org/interpreter) runs a JSON graph (`IGraph`) with these nodes.
- [`@hlang-org/compiler`](https://www.npmjs.com/package/@hlang-org/compiler) compiles a JSON graph to an ES module.

Source, issues, and documentation: [github.com/hlang-tech/hlang](https://github.com/hlang-tech/hlang).

## License

MIT
