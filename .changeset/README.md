# Changesets

This directory holds pending release notes for the published `@hlang-org/*` packages.

Add a changeset in the same pull request as a change to a published package:

```sh
pnpm changeset
```

Select the changed packages and the semver bump. Then write one or two sentences that describe the change for users of the package. The release process consumes these files on the `release/*` branch. See [CONTRIBUTING.md](../.github/CONTRIBUTING.md#releases).
