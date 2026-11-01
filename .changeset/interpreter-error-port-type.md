---
'@hlang-org/interpreter': major
---

For runtime 2.

- RxJS 7 is a peer dependency (it was RxJS 6, as a dependency).
- Nodes receive a frozen copy of the middleware: they can use the host's services but cannot add to them to share state, and the host's object is left as it is.
- `IRuntimeNode.E()` returns `IRuntimePort | undefined`: a Writable node has no error port.
