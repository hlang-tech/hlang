---
title: Introduction
description: What hlang is, the three kinds of node, and how the packages fit together.
group: Start
order: 1
---

hlang is a flow-based language for JavaScript. A program is a graph of nodes, and the connections between nodes are live RxJS streams. You can write the graph in code with the runtime, store it as JSON (an `IGraph`), run that JSON with the interpreter, or compile it to an ES module.

## Three kinds of node

| Kind | Role | Ports |
| --- | --- | --- |
| **R**, Readable | A source. It sends. | Outputs, plus `@node/error` |
| **T**, Transform | Receives, maps, sends. | Inputs and outputs, plus `@node/error` |
| **W**, Writable | A sink. It receives. | Inputs only, no error port |

Ports are named, and a node can have any number of them. A connection always runs from an output port to an input port; the runtime throws on any other direction. Transform nodes can connect in a cycle, so feedback is part of the language.

## One front end, two backends

`planGraph` in `@hlang-org/ir` checks an `IGraph` and plans it once. The interpreter runs that plan in process. The compiler prints the same plan as an ES module. A rule added to the plan applies to both backends, and a parity test runs one graph through both and compares the results.

## Packages

| Package | What it does |
| --- | --- |
| [`@hlang-org/runtime`](/docs/runtime) | The RxJS engine: nodes, ports, flows. |
| [`@hlang-org/ir`](/docs/igraph) | The `IGraph` types and `planGraph`. No dependencies. |
| [`@hlang-org/interpreter`](/docs/interpreter) | Runs an `IGraph` in process. |
| [`@hlang-org/compiler`](/docs/compiler) | Prints an `IGraph` as an ES module. |
| [`@hlang-org/editor-core`](/docs/lumen) | Lumen: the headless editor model. |
| [`@hlang-org/editor-react`](/docs/lumen) | Lumen: React bindings for React Flow. |
| [`@hlang-org/editor-ui`](/docs/lumen) | Lumen: the design system. |

Every package is also published under `@hlang-tech` with identical builds and versions. Use one scope in a project.

> [!NOTE]
> The Lumen packages are 0.x. They are in active development and their APIs can change in any minor release.

Next: [Getting started](/docs/getting-started).
