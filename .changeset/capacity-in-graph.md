---
"@hlang-org/ir": minor
"@hlang-org/interpreter": minor
"@hlang-org/compiler": minor
---

Bounded connections in the graph (RFC 0001, part 3).

- ir: `IConnection` takes `capacity` (a positive integer) and `overflow` (`"drop-oldest"`). `planGraph` checks them at run time and carries them into `PlannedConnection`.
- interpreter: bounded connections pass their capacity and overflow to the runtime (`IRuntimePort.connect` takes `IRuntimeConnectOptions`).
- compiler: a compiled program connects them the same way.

A parity test runs one bounded graph through both backends and compares the results.
