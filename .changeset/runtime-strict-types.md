---
'@hlang-org/runtime': major
---

Typed without `any`, under the same strict compiler and lint settings as the other packages. JavaScript programs run unchanged; TypeScript programs may need to declare types. See "Migrating from 1.x" in the README.

- A node's options type is its type argument (`TransformNode<ScaleOptions>`); without one, `opts` is `Readonly<Record<string, unknown>>`. Messages are `unknown`.
- `PortAccessor`, `MessageHandler`, `AnyNode`, `NodeOptions`, `FlowOptions`, and `NodeKind` are exported.
- `I(name)` and `O(name)` throw an error naming the node and the port when the port does not exist, instead of returning `undefined`.
- Port names containing a dot resolve.
- `send` on a port with a `pipe` emits instead of throwing.
- `Node` is abstract.
