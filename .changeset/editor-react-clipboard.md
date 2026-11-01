---
'@hlang-org/editor-react': patch
---

Paste validates what it reads from the system clipboard. A tagged clipboard envelope used to be trusted as it was, so text from another program could add nodes the editor cannot handle; now every node and edge must be valid, or the clipboard is ignored.
