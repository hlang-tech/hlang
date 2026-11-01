# RFC 0001: Bounded connections, back-pressure and end of stream

| | |
| --- | --- |
| Status | Draft, for review |
| Packages | `@hlang-org/runtime`, `@hlang-org/ir`, `@hlang-org/interpreter`, `@hlang-org/compiler`, the editor packages |
| Release | 2.x, additive: a graph that uses none of this runs exactly as today |

## Summary

Give hlang the three runtime properties that make Flow-Based Programming (FBP) what it is, as J. Paul Morrison defined it and JavaFBP implements it:

1. **Bounded connections.** A connection has a capacity, declared in the graph. A sender that finds it full waits until there is room. This is FBP's back-pressure.
2. **One information packet at a time.** An input works on one message until its handler has finished, including asynchronous work, so a slow consumer slows its producer instead of piling up work.
3. **End of stream.** A sender can close its output; a connection closes when every sender to it has closed; a receiver learns that no more data will come; a flow knows when it has finished.

It also settles the two places where hlang differs from classic FBP (fan-out and packet ownership) by defining their semantics instead of leaving them implicit.

## Motivation

Today every connection is an unbounded RxJS stream, and the engine ignores what a handler returns. Three failures follow, all reproducible:

- **Asynchronous work piles up.** A node that calls an HTTP API, a model, or ffmpeg for each message returns at once; the engine delivers the next message immediately. A source sending 10 messages a second to a node that needs 2 seconds each has 20 requests in flight after 2 seconds, 200 after 20, and memory and the downstream service grow without limit. This is the main shape of server-side and media work (Prism).
- **A sliced flow buffers without limit.** With `slice`, a source sending 200,000 values in one loop has all of them queued at once (measured).
- **Nothing ends.** A source that has finished cannot say so. A batch flow cannot tell when its work is done, and nodes that aggregate (sum, collect, sort) cannot emit a final result.

RxJS cannot supply these: it has had no back-pressure protocol since version 5 (`controlled`/`pausable` were removed). Its flow-control operators (`throttle`, `sample`, `buffer`, `mergeMap` with a concurrency limit) drop or batch values, and are used inside a node, not between nodes.

## Reference semantics: FBP

From Morrison's definition and the JavaFBP engine (`com.jpaulmorrison.fbp.core.engine.Connection` and `Network`, read at the source):

| Property | JavaFBP |
| --- | --- |
| Capacity | Each connection has a fixed `capacity`. The network default is 1 in debug mode and 10 in production; a connection may set its own. |
| Full connection | `send` loops `while (isFull())` and calls `wait()`: the sender is suspended. A connection with the `dropOldest` attribute drops its oldest packet instead. |
| Empty connection | `receive` waits. |
| Many senders | A connection counts its senders (`senderCount`); several outputs may feed one input. |
| End of stream | A connection is closed when every sender has closed (`senderCount == 0`) and drained when closed and empty; `receive` then returns end of stream. |
| Packet ownership | A packet is owned by one process at a time and is disposed of by its owner. |
| Fan-out | An output port feeds one connection. Copies are made by an explicit component (Replicate). |

## Design

### 1. Capacity is a property of the connection

As in FBP notation and JavaFBP, capacity is declared where the connection is declared, so it is part of the graph, not of a node:

- **IR.** `IConnection` gains an optional `capacity` (a positive integer). `planGraph` validates it and carries it into `PlannedConnection`, so the interpreter and the compiler apply the same rule (one front end, two backends).
- **Runtime.** `output.connect(input, { capacity })`.
- **Editor.** Capacity is edited on the edge and shown on it.
- **Default.** A connection without a capacity is unbounded, as today. JavaFBP's default of 10 is the natural default for hlang 3.0; changing it in 2.x would change running graphs.

A connection's occupancy counts the messages waiting in it **and** the messages its input is still working on (see section 3), so a slow asynchronous consumer fills its connection.

### 2. Sending: suspend when full

JavaScript has no threads to suspend, so the suspension is asynchronous. Two forms, following JavaFBP for the blocking form and Node.js streams for the non-blocking one:

```ts
// Blocking, FBP's send: resolves once the message has a place in every
// bounded connection of the port.
await $o('out').write(value);

// Non-blocking, Node.js streams' write(): the message is accepted at once;
// false means a bounded connection is now full and the sender should wait.
if (!$o('out').send(value)) {
  await $o('out').ready();
}
```

- `send(message)` keeps its behavior and gains a `boolean` result (`void` today, so existing callers are unaffected). On a full connection it still accepts the message, beyond the capacity, as `Writable.write()` does past its high-water mark: a sender that ignores back-pressure keeps working, and the overrun is visible to observers.
- `ready(): Promise<void>` resolves when every bounded connection of the port has room (Node.js streams' `'drain'`).
- `write(message): Promise<void>` is `ready()` then `send()`: FBP's suspending send.
- A connection may set `overflow: 'drop-oldest'` (JavaFBP's `dropOldest`): when full it drops its oldest waiting message instead of growing. Dropped messages are reported to the flow's observer. Other lossy strategies (latest only, sampling) are not connection attributes: they change what the program means, so they belong in the graph as nodes, where they can be seen.

### 3. Receiving: one information packet at a time

A handler may return a promise. An input port that has been given a bounded connection, or that asks for it, does not deliver its next message until the promise has settled:

```ts
$i('in').receive(async (value) => {
  await render(value);          // the next value waits; the connection fills
}, { concurrency: 1 });         // FBP: one packet at a time
```

- `concurrency` (default: unlimited, today's behavior) limits how many messages the port works on at once. `1` is FBP's model; a larger number serves a pool of workers, as `mergeMap(fn, n)` does.
- An input fed by a bounded connection uses `concurrency: 1` unless it says otherwise, so declaring a capacity is enough to get FBP's behavior end to end.
- A rejected promise is a handler failure and is routed as one today (a Transform's error port, otherwise `onError`); the slot is freed either way.

### 4. End of stream

```ts
$o('out').close();                       // this sender has no more to send

$i('in').receive(handler, {
  end: () => $o('total').send(total),    // every sender to this input has closed
});

await flow.done;                         // every node has finished
```

- A connection closes when every output connected to it has closed (JavaFBP's sender count) and, once its waiting messages are delivered, reports end of stream to its input.
- A Transform whose inputs have all ended closes its outputs once its handlers have settled, so end of stream travels through a graph without code in every node. A node that keeps producing after its inputs end (a timer) opts out.
- `flow.done` resolves when every node has finished (every Writable input has ended); `dispose()` before that rejects it with a `FlowDisposedError`.
- A Readable that finishes (a range, a file read to the end) closes its outputs.

### 5. Fan-out: kept, with defined back-pressure

hlang keeps letting one output feed several inputs; NoFlo, Node-RED and Akka Streams' `Broadcast` do the same. Classic FBP forbids it because a packet has one owner; section 6 deals with ownership instead.

With bounded connections, a fan-out waits for its slowest branch: `ready()` resolves only when every bounded connection of the port has room, as Akka's `Broadcast` back-pressures when any of its outputs does. End of stream reaches every branch.

### 6. Packet ownership: messages are immutable values

Two branches of a fan-out receive the same object; if one mutates it, the other sees the change. Copying per branch (Node-RED clones the message for every wire after the first) is not acceptable for hlang's media work, where a message can be an image or a video frame, and objects such as buffers and streams cannot be copied faithfully.

hlang instead adopts the contract of React and Redux: **a node never mutates a message it received; it sends a new value.** Messages move without copying.

- `new Flow({ freezeMessages: true })` deep-freezes plain objects and arrays as they are sent, so a node that breaks the contract fails at once, with its own node as the error's source. The editor enables it; a server leaves it off (zero cost).
- Typed arrays and buffers cannot be frozen; the contract applies to them all the same and the documentation says so.
- Freezing by default everywhere would break nodes that mutate what they receive, so it is a question for 3.0, not 2.x.

### 7. How it fits what exists

- **Slicing.** A sender waiting in `ready()`/`write()` resumes in a later task; slicing keeps its budget per task. A sliced flow with bounded connections no longer queues without limit.
- **Dispose.** Disposing a flow rejects pending `ready()`/`write()` promises and `flow.done` with `FlowDisposedError`, drops waiting messages, and runs teardowns as today.
- **Observability.** Delivery events gain the time a message waited in its connection; new events report a connection becoming full, a dropped message (`drop-oldest`) and end of stream. The editor shows a connection's occupancy on the edge.
- **Order.** Messages on one connection still arrive in the order they were sent; a message waiting for room keeps its place.
- **Both backends.** Capacity and overflow travel in the IR through `planGraph`; the interpreter passes them to `connect`, and the compiler prints them. The parity test runs a bounded, asynchronous graph through both.

## Alternatives considered

- **Reactive Streams' `request(n)`** (RxJava's `Flowable`, Reactor, Akka Streams). Demand-driven pull is precise but asks every node to request data explicitly. FBP's bounded buffer gives the same guarantee with the capacity declared once, on the connection, which is where a visual graph can show it.
- **RxJS operators only.** Lossy or batching, applied inside one node; they cannot slow a producer in another node.
- **Copying messages on fan-out** (Node-RED). Rejected for cost and for objects that cannot be copied (section 6).
- **A finite default capacity in 2.x.** Correct for FBP, but it would change graphs that run today. Proposed for 3.0.

## Delivery plan

Each step is its own pull request, with failing tests first and CI followed to the end:

1. Runtime: bounded connections, `send` result, `ready`, `write`, `drop-oldest`, input `concurrency`, promise-returning handlers.
2. Runtime: end of stream (`close`, `end`, propagation through Transforms, `flow.done`, `FlowDisposedError`).
3. IR, interpreter and compiler: `capacity` and `overflow` in the graph; parity tests.
4. Editor: capacity on edges, occupancy and end of stream in the live view, run log entries.
5. Runtime: `freezeMessages`, with the editor enabling it.

## Questions for review

1. Should an input fed by a bounded connection default to `concurrency: 1` (FBP), or should concurrency always be explicit?
2. Should a Transform close its outputs automatically when its inputs have ended (proposed), or only when it says so?
3. `drop-oldest` is the only lossy connection attribute (JavaFBP has the same one). Is that the right line?
