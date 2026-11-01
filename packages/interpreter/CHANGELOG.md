# @hlang-org/interpreter

## 2.0.0

### Major Changes

- 2088608: For runtime 2.
  
  - RxJS 7 is a peer dependency (it was RxJS 6, as a dependency).
  - Nodes receive a frozen copy of the middleware: they can use the host's services but cannot add to them to share state, and the host's object is left as it is.
  - `IRuntimeNode.E()` returns `IRuntimePort | undefined`: a Writable node has no error port.

### Patch Changes

- Updated dependencies [2088608]
  - @hlang-org/runtime@2.0.0

## 1.0.1

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.
- Updated dependencies [57f7a67]
  - @hlang-org/runtime@1.0.7
  - @hlang-org/ir@1.0.1
