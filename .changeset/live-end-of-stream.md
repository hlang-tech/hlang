---
"@hlang-org/runtime": minor
"@hlang-org/interpreter": minor
"@hlang-org/editor-core": minor
"@hlang-org/editor-ui": minor
---

End of stream and drops, live (RFC 0001, part 4b).

- runtime:
  - The observer gains `ended` (an input ended) and `finished` (a node finished).
  - A node whose output closes is now marked finished before anything downstream learns of it.
- interpreter: a traced run reports `onEnded`, `onFinished` and `onDropped` by graph id.
- editor-core: the execution handle forwards them.
- editor-ui:
  - The run log shows ended inputs, finished nodes and dropped messages.
  - The inspector's run statistics count drops and show when a node has finished.
  - A finished node steps back on the canvas.
