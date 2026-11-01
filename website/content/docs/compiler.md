---
title: Compiler
description: Print an IGraph as a standalone ES module, and migrate from compiler 1.x.
group: Language
order: 6
package: compiler
---

`@hlang-org/compiler` turns an `IGraph` into an ES module. It plans the graph with `planGraph`, builds an ESTree program from the plan and prints it. The module exports `run(options)`.

```js file=compile.mjs
```

The output below is the printed module, then the module's own output when the example imports and runs it:

```text output=compile
```

## compile(graph, options)

| Option | Contents |
| --- | --- |
| `nodes` | For every node `code`: `{ from, name? }`, the module to import it from and its export name (the default export when `name` is omitted). |
| `runtime` | The module that exports `Flow`. Defaults to `@hlang-org/runtime`. |
| `rxjs` | The module that exports `Subject`. Defaults to `rxjs`. |

It returns `{ code, imports }`: the module source and every module specifier it imports, in order.

The compiled `run(options)` accepts `flowId`, `env` (default `'prod'`), `middleware` and `onError`, and returns `{ flowId, nodes, dispose }`.

## Errors

`compile` throws a `GraphError` for an invalid graph, the same as the interpreter, and a `CompileError` with one of these codes:

| Code | Meaning |
| --- | --- |
| `unresolved-node` | A node `code` in the graph has no entry in `options.nodes`. |
| `invalid-import` | An export `name` is not a valid JavaScript identifier. |
| `unserializable-config` | A node's configuration holds a value that is not JSON (null, boolean, finite number, string, array or plain object), such as a function or a class instance. |

## Migrating from 1.x

Version 2 is a rewrite. 1.x remains on npm, and `^1.0.0` ranges do not resolve to 2.x.

| 1.x | 2.x |
| --- | --- |
| The default export `build(graph)` wrote a project to the temp directory and ran `npm install`. | `compile(graph, options)` returns `{ code, imports }`. Write and install them yourself. |
| Node modules came from each node's `runtimeResource`. | Map each `code` in `options.nodes`. |
| The output depended on `@hset/xlang-runtime-middleware`, lodash and child-process IPC. | The output depends only on the runtime, RxJS and your node modules. Pass services as `middleware`. |
| The `complier` export. | Removed. Use `compile`. |

The full API is in the [compiler reference](/docs/api/compiler).
