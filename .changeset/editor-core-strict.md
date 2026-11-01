---
'@hlang-org/editor-core': minor
---

- `parseGraphSnapshot(value)` reads a graph snapshot from untrusted data (the clipboard, a file) and returns `null` unless every node and edge is valid.
- `createDecorator` throws when a service name already has an identifier in the same module instance, instead of returning the existing identifier under a possibly different type. `ServiceIdentifier.type` is an optional phantom.
- Dependency metadata, identifiers, and the event bus are typed without assertions; the container keeps its two documented unchecked steps (looking an instance up by name, and passing injected arguments to a constructor).
