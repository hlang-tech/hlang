# @hlang-org/runtime

## 1.0.7

### Patch Changes

- 57f7a67: Show a package banner at the top of the README on npm. `@hlang-org/runtime` restores its original description and keywords; the compiler keeps the original hlang keywords alongside its own.

## 1.0.6

### Patch Changes

- ff30f50: Upgrade `uuid` to `^11.1.1`, which resolves the moderate npm audit advisory for `uuid` below 11.1.1 (the runtime only uses `v4` and `validate`, which were not affected). Add `repository`, `bugs`, and corrected `homepage` metadata, a package README, and the LICENSE file. No API or behavior changes.
