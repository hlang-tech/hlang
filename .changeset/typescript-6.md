---
'@hlang-org/runtime': patch
---

Built with TypeScript 6. The CommonJS build now inlines its module interop helpers instead of relying on `tslib`, which is not a dependency of this package. The public API and the type declarations are unchanged.
