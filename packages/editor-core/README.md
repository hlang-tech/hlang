<p align="center">
  <img src="https://raw.githubusercontent.com/hlang-tech/hlang/main/media/logo.png" width="88" alt="hlang">
</p>

# @hlang-org/editor-core

The headless core of Lumen, the hlang visual editor. It holds the graph being edited, changes it only through reversible commands, validates connections, reports edit-time diagnostics, and serializes to `IGraph`. It has no React, no DOM, and no RxJS in its public API, so it runs in any JavaScript environment and in plain unit tests.

[![npm](https://img.shields.io/npm/v/@hlang-org/editor-core?color=c8ccd4&labelColor=0f1114)](https://www.npmjs.com/package/@hlang-org/editor-core)
[![license](https://img.shields.io/npm/l/@hlang-org/editor-core?color=c8ccd4&labelColor=0f1114)](https://github.com/hlang-tech/hlang/blob/main/LICENSE)

> **Status:** 0.x, in active development. The API can change in any minor release.

## Install

```sh
npm install @hlang-org/editor-core
```

The same build is published as `@hlang-tech/editor-core`. ESM and CommonJS builds with type declarations.

## Usage

```ts
import { createEditorCore, AddNodeCommand, ConnectCommand } from '@hlang-org/editor-core';
import type { NodeDescriptor } from '@hlang-org/editor-core';

const DTO = { name: 'DTO', kind: 'interface' } as const;
const numbers: NodeDescriptor = {
  code: 'numbers',
  kind: 'R',
  displayName: 'Numbers',
  group: 'sources',
  ports: [
    { id: 'out', direction: 'O', name: 'out', dataType: DTO, isError: false },
    { id: '@node/error', direction: 'O', name: 'error', dataType: DTO, isError: true },
  ],
  defaultParams: { count: 3 },
  runtimeResource: 'my-nodes/numbers',
};

const core = createEditorCore();
core.registry.register(numbers);

const node = core.registry.createNode('numbers', { x: 0, y: 0 });
core.commands.execute(new AddNodeCommand(node));
core.history.undo();
core.history.redo();

const graph = core.serialization.toIGraph(core.model); // IGraph
```

### Running the graph

Pass a graph runner to enable execution. `InterpreterGraphRunner` runs the graph with [`@hlang-org/interpreter`](https://www.npmjs.com/package/@hlang-org/interpreter):

```ts
import { Flow } from '@hlang-org/runtime';
import { NodeRegistry } from '@hlang-org/interpreter';
import { createEditorCore, InterpreterGraphRunner } from '@hlang-org/editor-core';

const runtimeNodes = new NodeRegistry().register('numbers', Numbers);
const core = createEditorCore({ graphRunner: new InterpreterGraphRunner(runtimeNodes, () => new Flow()) });

const handle = core.execution?.run(core.model);
handle?.dispose();
```

## The editor core

`createEditorCore(options?)` returns an `EditorCore` with these services:

| Member | Responsibility |
| --- | --- |
| `model` | The graph being edited: nodes, edges, positions, parameters. |
| `commands` | The only way to change the model. `execute(command)` validates, applies, and records the command. |
| `history` | `undo()`, `redo()`, `canUndo()`, `canRedo()`, and `transact(label, fn)` to group commands into one step. |
| `selection` | Selected nodes and edges. Not serialized. |
| `viewState` | Hidden and locked flags per node. Not serialized. |
| `registry` | Node descriptors (`code`, kind, ports, default parameters) and `createNode`. |
| `validator` | Connection rules: output to input, no self-connections, no duplicates, compatible port types. Transform cycles are allowed. |
| `diagnostics` | Edit-time problems, recomputed on change. |
| `serialization` | `toIGraph(model)` and `fromIGraph(graph)`. |
| `events` | A typed event bus: `nodeAdded`, `nodeRemoved`, `nodeChanged`, `edgeAdded`, `edgeRemoved`, `selectionChanged`, `viewStateChanged`, `historyChanged`. |
| `execution` | Present when a `graphRunner` is supplied. |

Options: `idGenerator` (deterministic ids, for tests) and `graphRunner`.

### Commands

`AddNodeCommand`, `RemoveNodeCommand` (also removes and restores incident edges), `ConnectCommand`, `DisconnectCommand`, `MoveNodeCommand`, `UpdateParamsCommand`, `RenameNodeCommand`, `SetHiddenCommand`, `SetLockedCommand`. Every command has an inverse, so every edit can be undone. A rejected command returns `{ ok: false, error }` and is not recorded.

### Diagnostics

| Code | Severity | Meaning |
| --- | --- | --- |
| `bad-connection` | error | An edge breaks a connection rule. |
| `no-source-root` | error | The graph has nodes but no Readable node to run. |
| `unregistered-code` | error | A node's `code` is not in the registry. |
| `type-mismatch` | warning | An edge links incompatible port types. |
| `dead-source` | warning | A Readable output feeds nothing. |
| `dangling-input` | warning | A Transform input is not connected. |
| `sink-no-upstream` | warning | A Writable input is not connected. |

### Utilities

- `cloneNodesWithEdges` copies a selection with its internal edges, for copy and paste.
- `planInsertOnEdge` and `distanceToSegment` support dropping a node onto an edge.
- `GraphTopology`, `TopologyIndex`, `layoutLayered`, and `layoutGrouped` analyze connected components and compute layered layouts.

### Dependency injection

Services are resolved through a small dependency-injection container in the style of VS Code (`createDecorator`, `ServiceCollection`, `InstantiationService`). It has no runtime dependencies and needs no `reflect-metadata`. Use it to replace a service in a custom container.

## Related packages

- [`@hlang-org/editor-react`](https://www.npmjs.com/package/@hlang-org/editor-react): React Flow bindings for this core.
- [`@hlang-org/editor-ui`](https://www.npmjs.com/package/@hlang-org/editor-ui): the Lumen design system.

Source and documentation: [github.com/hlang-tech/hlang](https://github.com/hlang-tech/hlang).

## License

MIT
