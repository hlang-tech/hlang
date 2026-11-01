# @hlang-org/runtime

## 1.1.1

### Patch Changes

- 55d4aa1: Wire every connection between the same two nodes. The flow graph kept one edge per pair of nodes, so when two connections joined the same pair (one output into two inputs of a node, or two outputs of a node into another), only the last one delivered values. Interpreted and compiled programs both run on this engine and now deliver on every connection.

## 1.1.0

### Minor Changes

- 058f4d5: Add an ES module build. `import` resolves to `lib/index.mjs`; `require` still
  resolves to the CommonJS build in `lib/`, unchanged, and deep `lib/...` imports
  keep working through the `exports` map. Vite and other ESM tools no longer need
  to convert the runtime from CommonJS.

### Patch Changes

- 47d9059: Built with TypeScript 6. The CommonJS build now inlines its module interop helpers instead of relying on `tslib`, which is not a dependency of this package. The public API and the type declarations are unchanged.

## 1.0.7

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.

## 1.0.6

### Patch Changes

- ff30f50: Upgrade `uuid` to `^11.1.1`, which resolves the moderate npm audit advisory for `uuid` below 11.1.1 (the runtime only uses `v4` and `validate`, which were not affected). Add `repository`, `bugs`, and corrected `homepage` metadata, a package README, and the LICENSE file. No API or behavior changes.
