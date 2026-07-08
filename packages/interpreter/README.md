# @hlang-org/interpreter

The **interpreter for hlang** — a first-class execution engine for hlang's
`IGraph` intermediate representation, on equal footing with
`@hlang-org/compiler`.

hlang is a visual programming language: it has a program representation
(`IGraph` today, a DSL in the future) and two ways to execute that program.
The **compiler** performs AOT — it renders a program into a distributable
JavaScript artifact. The **interpreter** performs direct evaluation — it reads
a program and runs it in place, defining hlang's interpreted execution
semantics. Both consume the identical `IGraph`, so a program authored once can
be either interpreted or compiled without divergence.

The interpreter is host-agnostic. It evaluates a program into a live,
RxJS-backed reactive object graph with **no code generation, no `npm install`,
no child process, and no file IO**, which makes it suitable anywhere hlang runs:
server-side in Node, in the browser, in tests/CI, in a REPL for interactive
exploration, or embedded in an editor. It takes no dependency on any particular
host or UI.

## Compiler vs. interpreter

`@hlang-org/compiler` renders an `IGraph` into a JavaScript source string, then
installs dependencies and runs it in a forked process — ideal for producing a
distributable program. The interpreter instead performs the exact same
construction the compiler's template emits — `new NodeClass(...)`,
`Output.O(id).connect(Input.I(id))`, `flow.run(readableRoot)` — directly
against real runtime objects in memory. Neither is "the desktop path" or "the
server path"; they are two execution strategies for the same language, chosen
per use case (AOT distribution vs. in-process evaluation).

## Usage

```ts
import { interpret, NodeRegistry, Flow } from '@hlang-org/interpreter';
import { Flow as RuntimeFlow } from '@hlang-org/runtime';

const registry = new NodeRegistry()
  .register('my-source', MySourceNode)   // extends ReadableNode
  .register('my-sink', MySinkNode);      // extends WriteableNode

const handle = interpret(graph, {
  registry,
  createFlow: () => new RuntimeFlow({}),
});

handle.onError(({ nodeId, error }) => {
  // errors emitted on a node's `@node/error` port
});
```

## Semantics honored (verified against runtime source)

- Wiring is `Output.O(portId).connect(Input.I(portId))`. In `IGraph`, a
  connection's `Output` is the upstream **source** and `Input` the downstream
  **target**; wrong-direction wiring throws (never silently mis-delivers).
- Every Readable (`R`) node is a root and is `flow.run`. A graph with zero `R`
  nodes throws, matching the runtime.
- Error ports (`@node/error`, present on `R`/`T`, absent on `W`) are subscribed
  before the flow runs; emissions are buffered so late `onError` listeners still
  observe synchronous errors.
- `T`↔`T` feedback loops are accepted (feedback is a first-class hlang feature).

## Quality bar

Zero `any` (`noImplicitAny: true`, full strict), TDD (failing tests first),
ESLint 0 error / 0 warning, ~98% test coverage.

## Scripts

- `npm test` — jest with coverage
- `npm run build` — emit `lib/`
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
