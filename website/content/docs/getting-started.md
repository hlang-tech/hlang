---
title: Getting started
description: Install hlang, write a graph in code, then run the same program as data.
group: Start
order: 2
---

## Install

```sh
npm install @hlang-org/runtime @hlang-org/interpreter rxjs
```

Every package ships with type declarations. The runtime is one ES module (`require` works on Node.js 20.19, 22.12, and later); the other packages ship ES module and CommonJS builds. RxJS 7 is a peer dependency of the runtime and the interpreter.

## Write three nodes

A node is a class. It declares its ports in the constructor and does its work in one method: `_read` for a Readable, `_transform` for a Transform, `_write` for a Writable.

```js file=lib/nodes.mjs
```

## Wire them and run

Connect an output port to an input port, then run the flow from the Readable root.

```js file=runtime.mjs
```

```text output=runtime
```

## Run the same program as data

The same graph as JSON. Each node's `code` names a node class; the registry maps codes to classes.

```js file=lib/graph.mjs
```

```js file=interpret.mjs
```

```text output=interpret
```

> [!TIP]
> Every example on this site is a file in the repository that runs in CI. The output above is the output of that run.

Next: [Nodes and ports](/docs/runtime), or [compile the graph](/docs/compiler) to a module.
