---
'@hlang-org/compiler': minor
---

Compiled programs give nodes a frozen copy of the middleware, as the interpreter does, so nodes cannot add to it to share state. The parity tests run typed ES module fixtures in both backends and report through middleware instead of a global.
