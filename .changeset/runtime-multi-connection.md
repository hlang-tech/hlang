---
'@hlang-org/runtime': patch
---

Wire every connection between the same two nodes. The flow graph kept one edge per pair of nodes, so when two connections joined the same pair (one output into two inputs of a node, or two outputs of a node into another), only the last one delivered values. Interpreted and compiled programs both run on this engine and now deliver on every connection.
