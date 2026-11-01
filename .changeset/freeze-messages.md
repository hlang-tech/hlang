---
"@hlang-org/runtime": minor
"@hlang-org/interpreter": minor
"@hlang-org/compiler": minor
"@hlang-org/editor-core": minor
---

Messages are immutable values (RFC 0001, part 5).

- runtime: `new Flow({ freezeMessages: true })` deep-freezes the plain objects and arrays in each message as it is sent. A node that mutates what it received fails at once, in its own handler, and the other branches of a fan-out keep what was sent. It is off by default.
- interpreter: `interpret(graph, deps, { freezeMessages })`.
- compiler: compiled `run({ freezeMessages })`.
- editor-core: `InterpreterGraphRunner` freezes messages by default (`freezeMessages: false` turns it off).
