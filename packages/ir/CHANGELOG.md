# @hlang-org/ir

## 1.1.0

### Minor Changes

- 8c4ec76: Bounded connections in the graph (RFC 0001, part 3).
  
  - ir: `IConnection` takes `capacity` (a positive integer) and `overflow` (`"drop-oldest"`). `planGraph` checks them at run time and carries them into `PlannedConnection`.
  - interpreter: bounded connections pass their capacity and overflow to the runtime (`IRuntimePort.connect` takes `IRuntimeConnectOptions`).
  - compiler: a compiled program connects them the same way.
  
  A parity test runs one bounded graph through both backends and compares the results.

## 1.0.1

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.
