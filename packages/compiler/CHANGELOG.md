# @hlang-org/compiler

## 2.0.1

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.
- Updated dependencies [57f7a67]
  - @hlang-org/ir@1.0.1

## 2.0.0

### Major Changes

- c472104: Rewrite the compiler. `compile(graph, { nodes })` now lowers an IGraph through the shared `planGraph` front end, builds an ESTree program, and returns a standalone ES module whose `run(options)` executes the graph with the same semantics as `@hlang-org/interpreter`. `compile` is pure: it writes no files and installs nothing.
  
  Breaking changes from 1.x:
  
  - The default export and `complier` are removed. Import `compile` by name.
  - `build()` no longer writes to the temporary directory or runs `npm install`. Write `result.code` to a file and install `result.imports` with your package manager.
  - Node classes are imported from the modules you map in `options.nodes`, instead of from each node's `runtimeResource`.
  - Generated programs no longer depend on `@hset/xlang-runtime-middleware`, lodash, or child-process IPC. Pass `middleware` to `run()`.
  - The package now ships ESM and CommonJS builds with type declarations.
  
  Version 1.x stays available on npm; `^1.0.0` ranges do not resolve to 2.0.0.
