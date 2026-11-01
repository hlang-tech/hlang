---
"@hlang-org/runtime": minor
"@hlang-org/interpreter": minor
"@hlang-org/compiler": minor
"@hlang-org/editor-core": minor
---

Time-sliced delivery: a flow can share its thread.

- runtime:
  - `new Flow({ slice: { budgetMs?, now?, yieldTo? } })` delivers for at most `budgetMs` (default 5) per task, then yields and continues in a later task, in the same order. A feedback loop with no asynchronous step then neither freezes a page nor starves a server, and `dispose()` stops it.
  - Each flow now has its own delivery queue.
  - `yieldToRuntime` picks `setImmediate`, `MessageChannel` or `setTimeout`, whichever the runtime has.
  - Synchronous delivery stays the default and is unchanged.
- interpreter: `interpret(graph, deps, { slice })` passes it to the flow; `IRuntimeFlowOptions.slice` is new.
- compiler: a compiled program's `run({ slice })` does the same.
- editor-core: `InterpreterGraphRunner` slices runs by default (`{ slice: false }` turns it off), so a graph that loops forever cannot freeze the editor.
