# @hlang-org/editor-core

The **headless, framework-agnostic core** of the hlang visual editor.

Zero React, zero pixels, and no RxJS in its public surface. This package holds
all of the editor's *logic* — the graph document, a command/undo system,
selection, connection validation, a design-time node registry, `IGraph`
serialization, and an execution seam — behind dependency-injected service
interfaces. It can be embedded in any local-first application; a React binding
layer and a design-system UI are built on top of it in separate packages.

The split mirrors how large editors (VSCode, language servers) separate the
editor *core* from its presentation.

## Architecture

```
editor-core (this package, headless)
  ├── di/           createDecorator + ServiceCollection + InstantiationService
  ├── model/        EditorNode, EditorEdge, PortDescriptor, NodeDescriptor …
  ├── services/     IGraphModel, ICommandService, IHistoryService,
  │                 ISelectionService, INodeRegistry, IConnectionValidator,
  │                 ISerializationService, IExecutionService, IEventBus
  └── commands/     Add/Remove/Connect/Disconnect/Move/UpdateParams (reversible)
```

### Dependency injection

A lightweight, VSCode-style DI with **zero runtime dependencies** (no
`reflect-metadata`, no container library). A service identifier is both a
resolution token and a constructor parameter decorator:

```ts
export interface IGraphModel { /* … */ }
export const IGraphModel = createDecorator<IGraphModel>('graphModel');

class CommandContextProvider {
  constructor(
    @IGraphModel private readonly model: IGraphModel,
    @IConnectionValidator private readonly validator: IConnectionValidator,
    @IEventBus private readonly bus: IEventBus,
  ) {}
}
```

### hlang semantics encoded in the core

- **Direction**: an `EditorEdge { source, target }` requires `source` to be an
  output (O) port and `target` an input (I) port, matching the runtime's
  `O.connect(I)`. Serialization maps this to `IGraph`'s `{ Output, Input }`.
- **Error ports**: R and T nodes carry a `@node/error` output port; W nodes
  never do. The validator treats it as a source-only port.
- **Feedback cycles**: T↔T loops are always accepted — feedback is a
  first-class hlang feature, never a validation error.

## Usage

```ts
import { createEditorCore, AddNodeCommand, ConnectCommand } from '@hlang-org/editor-core';

const core = createEditorCore();
core.registry.register(myNodeDescriptor);

const node = core.registry.createNode('my-code', { x: 0, y: 0 });
core.commands.execute(new AddNodeCommand(node));
core.history.undo();

const graph = core.serialization.toIGraph(core.model); // -> IGraph
```

To enable execution, supply a graph runner (e.g. `InterpreterGraphRunner`,
which drives `@hlang-org/interpreter`):

```ts
import { createEditorCore, InterpreterGraphRunner } from '@hlang-org/editor-core';

const core = createEditorCore({
  graphRunner: new InterpreterGraphRunner(runtimeRegistry, () => new Flow({})),
});
core.execution?.run(core.model);
```

## Quality bar

Zero `any` (`noImplicitAny: true`, full strict), TDD, ESLint 0 error / 0
warning, ~96% statement coverage. Headless is enforced by tests that never
import React, RxJS, or `@xyflow/*`.

## Scripts

- `npm test` — jest with coverage
- `npm run build` — emit `lib/`
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
