# @hlang-org/editor-react

## 0.1.2

### Patch Changes

- 75c24cb: Paste validates what it reads from the system clipboard. A tagged clipboard envelope used to be trusted as it was, so text from another program could add nodes the editor cannot handle; now every node and edge must be valid, or the clipboard is ignored.
- Updated dependencies [75c24cb]
  - @hlang-org/editor-core@0.2.0

## 0.1.1

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.
- Updated dependencies [57f7a67]
  - @hlang-org/editor-core@0.1.1
