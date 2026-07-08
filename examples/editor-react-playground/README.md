# editor-react playground

A minimal Vite app that drives **`@hlang-org/editor-react`** end-to-end: add
R/T/W nodes, wire validated `O -> I` connections, undo/redo, and **Run** to
execute the graph through `@hlang-org/interpreter`.

Styling is intentionally plain (stock React Flow). The design system arrives in
`@hlang-org/editor-ui` (M3); this example exists to prove the binding layer.

## Prerequisites

The linked workspace packages must be built first (they are consumed from their
compiled `lib/`):

```bash
# from the repo root
cd packages/interpreter  && npm run build
cd ../editor-core        && npm run build
cd ../editor-react       && npm run build
```

## Run

```bash
cd examples/editor-react-playground
npm install     # first time only
npm run dev     # opens http://localhost:5173
```

## What to try

1. Click **+ Text Source (R)**, **+ Uppercase (T)**, **+ Console (W)** to add nodes.
2. Drag from a node's right (output) handle to another node's left (input)
   handle. Only valid `O -> I` connections are accepted — try a reversed or
   same-node drag and it will be refused.
3. Wire `Text Source → Uppercase → Console`, then press **▶ Run**. The uppercased
   text appears in the log at the bottom (executed by the interpreter against the
   real `@hlang-org/runtime`).
4. Use **Undo** / **Redo** to step through your edits.
