---
title: Lumen
description: The editor stack for hlang graphs, in three packages that depend in one direction.
group: Lumen
order: 7
---

Lumen edits an `IGraph` and runs it with the interpreter. It is generic: it knows nodes, ports and graphs, and nothing about any one product. A product adds its own node types and panels on top.

> [!NOTE]
> Lumen is 0.x. Its APIs can change in any minor release.

## Three layers

| | `editor-core` | `editor-react` | `editor-ui` |
| --- | --- | --- | --- |
| **Layer** | Model | Binding | Design |
| **Depends on** | `ir`, `interpreter` | `editor-core`, React Flow | `editor-react` |
| **Knows React?** | No | Yes | Yes |

Dependencies point one way. `editor-core` is headless: it has no React, no DOM and no RxJS in its public surface, and it runs in Node for tests. `editor-react` maps the core's state to React Flow and back. `editor-ui` is the design system: nodes, edges, panels and the editor shell.

## The core

Every change to a graph is a command, so undo and redo cover everything, and validation is never bypassed.

```ts
import { createEditorCore, AddNodeCommand } from '@hlang-org/editor-core';

const core = createEditorCore();
core.registry.register(numbers); // a NodeDescriptor: code, kind, ports, default parameters

const node = core.registry.createNode('numbers', { x: 0, y: 0 });
core.commands.execute(new AddNodeCommand(node));
core.history.undo();
core.history.redo();

const graph = core.serialization.toIGraph(core.model); // IGraph
```

Pass a graph runner to run the graph. `InterpreterGraphRunner` runs it with `@hlang-org/interpreter`:

```ts
import { Flow } from '@hlang-org/runtime';
import { NodeRegistry } from '@hlang-org/interpreter';
import { createEditorCore, InterpreterGraphRunner } from '@hlang-org/editor-core';

const runtimeNodes = new NodeRegistry().register('numbers', Numbers);
const core = createEditorCore({ graphRunner: new InterpreterGraphRunner(runtimeNodes, (options) => new Flow(options)) });

const handle = core.execution?.run(core.model);
handle?.dispose();
```

## Connection rules

The connection validator accepts only output-to-input links that respect the node kinds, and always allows a cycle between Transform nodes. In `editor-react`, an edge's `source` is an output port and its `target` is an input port, the same direction as an `IGraph` connection.

## Embedding the editor

The editor on the [home page](/#lumen) is these three packages with a kit of generic stream nodes. When the editor is one part of a page, pass `scope` to `useEditorHotkeys`, so its shortcuts answer only to keystrokes inside the editor:

```ts
const root = useRef<HTMLDivElement>(null);
useEditorHotkeys(core, { scope: root });
```

On a phone or a tablet without a trackpad the home page's editor is read-only, as design tools' viewers are: the graph can be looked at, selected and run, and the console works, but nothing changes it. The host decides, and the core enforces it:

```ts
const core = createEditorCore({ readOnly: true });
core.mode.setReadOnly(false); // when editing becomes possible
```

A read-only core refuses every command and every undo and redo, so no path can change the graph. The canvas follows `useReadOnly(core)` from `editor-react`: pass `nodesDraggable`, `nodesConnectable` and `edgesReconnectable` as `false` to React Flow, and `readOnly` to `CanvasDock`.

The full APIs are in the references for [editor-core](/docs/api/editor-core), [editor-react](/docs/api/editor-react) and [editor-ui](/docs/api/editor-ui).
