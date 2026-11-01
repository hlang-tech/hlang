---
"@hlang-org/editor-core": minor
"@hlang-org/editor-ui": minor
---

A Transform may connect to itself.

- editor-core: the connection validator no longer refuses a self-connection. The port directions alone decide, as for any connection, so only a Transform can loop back into itself, as ir and the runtime already allowed. The `self-connection` validation reason is gone.
- editor-ui: an edge from a node back into itself is drawn as a loop routed around the node: out of the output to the right, under the node, and up into the input from the left, with rounded corners. The route is `selfLoopPath`, with `SELF_LOOP_CLEARANCE` and `SELF_LOOP_RADIUS`.
