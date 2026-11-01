# @hlang-org/editor-core

## 0.2.0

### Minor Changes

- 75c24cb: - `parseGraphSnapshot(value)` reads a graph snapshot from untrusted data (the clipboard, a file) and returns `null` unless every node and edge is valid.
  - `createDecorator` throws when a service name already has an identifier in the same module instance, instead of returning the existing identifier under a possibly different type. `ServiceIdentifier.type` is an optional phantom.
  - Dependency metadata, identifiers, and the event bus are typed without assertions; the container keeps its two documented unchecked steps (looking an instance up by name, and passing injected arguments to a constructor).

### Patch Changes

- Updated dependencies [2088608]
  - @hlang-org/interpreter@2.0.0

## 0.1.1

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.
- Updated dependencies [57f7a67]
  - @hlang-org/ir@1.0.1
  - @hlang-org/interpreter@1.0.1
