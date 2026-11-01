---
'@hlang-org/interpreter': minor
---

`IRuntimeNode.E()` returns `IRuntimePort | undefined`: a Writable node has no error port, as the runtime has always behaved. The interpreter never relied on it. The test fixtures now use the runtime's own types instead of casting it.
