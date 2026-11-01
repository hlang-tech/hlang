---
"@hlang-org/runtime": minor
---

Bounded connections and back-pressure (RFC 0001, part 1).

- `output.connect(input, { capacity, overflow })` bounds a connection. It holds the messages waiting for its input and the ones the input is still working on.
- `send()` now returns whether every bounded connection of the port has room. `ready()` resolves when there is room; `write()` waits for it, then sends.
- A message handler may return a promise; until it settles, the message is still being worked on. A rejected promise is routed as a failure: before, it was an unhandled rejection.
- `receive(handler, { concurrency })` limits how many messages an input works on at once. An input fed by a bounded connection takes one at a time.
- `overflow: "drop-oldest"` lets a full connection drop its oldest waiting message; the observer's `dropped` reports it.
- A fan-out waits for its slowest bounded branch.
- `FlowDisposedError` rejects pending waits when the flow is disposed.

Unbounded connections deliver exactly as before; an interleaved benchmark measured no difference.
