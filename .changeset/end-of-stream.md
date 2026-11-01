---
"@hlang-org/runtime": minor
---

End of stream (RFC 0001, part 2).

- `output.close()` says a sender has nothing more to send. Sending on a closed output throws.
- An input ends once every connection into it has closed and its messages are done, including asynchronous work. `receive(handler, { end })` runs when it does.
- A Transform closes its outputs when all its inputs have ended (`closesWithInputs = false` opts out), so the end travels through the graph.
- A node finishes when its inputs have ended and its outputs are closed; its error port then closes.
- `flow.done` resolves when every node has finished, and rejects with `FlowDisposedError` on dispose.
- A sliced flow's first slice in each task now always delivers at least one message before its budget counts.

Graphs that never close a port run exactly as before.
