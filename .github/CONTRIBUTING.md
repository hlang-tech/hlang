# Contributing to hlang

Thank you for helping. This guide covers the setup, the branch workflow, the quality bar, and the release process. The engineering rules in [AGENTS.md](../AGENTS.md) apply to every change, whether a person or a coding agent writes it.

## Setup

Requirements: the Node.js version in [`.nvmrc`](../.nvmrc) and pnpm. Corepack selects the pnpm version pinned in `package.json`.

```sh
git clone https://github.com/hlang-tech/hlang.git
cd hlang
corepack enable
pnpm install
pnpm check
```

`pnpm check` builds every package, then runs type checking, ESLint, and the tests. CI runs the same command.

Tests run on [Vitest](https://vitest.dev) with V8 coverage. Each package's `vitest.config.mts` sets a coverage floor at its measured level; a change that lowers coverage fails the tests. Raise a floor when tests grow, and never lower one.

## Repository layout

| Path | Contents |
| --- | --- |
| `packages/runtime` | Nodes, ports, and flows on RxJS |
| `packages/ir` | `IGraph` types and `planGraph` |
| `packages/interpreter` | Runs an `IGraph` in process |
| `packages/compiler` | Compiles an `IGraph` to an ES module |
| `packages/editor-core` | Lumen: headless editor model |
| `packages/editor-react` | Lumen: React Flow bindings |
| `packages/editor-ui` | Lumen: design system |
| `examples/editor-react-playground` | The app that assembles the Lumen packages |
| `media/brand` | Brand assets and their generator |

Internal dependencies use the workspace protocol (`workspace:^`). Never reference a package in this repository with `file:` or a registry range.

## Branches

hlang uses git flow.

| Branch | Purpose |
| --- | --- |
| `main` | Released code. Every commit on `main` is a published release. |
| `develop` | The next release. All feature work merges here. |
| `feature/<topic>` | One feature or fix. Branch from `develop`, merge back into `develop`. |
| `release/<version>` | Release preparation. Branch from `develop`, merge into `main` and `develop`. |
| `hotfix/<topic>` | An urgent fix to a release. Branch from `main`, merge into `main` and `develop`. |

Open pull requests against `develop`, except for hotfixes.

## Making a change

1. Create `feature/<topic>` from an up-to-date `develop`.
2. Write a failing test first for logic in `ir`, `interpreter`, `compiler`, `editor-core`, and `editor-react`. See the testing policy in AGENTS.md.
3. Keep `pnpm check` and `pnpm lint:pkg` green: zero type errors, zero ESLint errors and warnings, no `any`.
4. If you change a published package, add a changeset with `pnpm changeset`.
5. Write commit messages in English with [Conventional Commits](https://www.conventionalcommits.org) prefixes (`feat`, `fix`, `refactor`, `test`, `docs`, `build`, `chore`). Mark breaking changes with `!` and a `BREAKING CHANGE:` footer.

Do not disable a test, skip a lint rule globally, or cast a type away to make a check pass. Fix the cause.

## Releases

Releases are made from a `release/<version>` branch.

1. `pnpm changeset version` applies the pending changesets: it bumps versions and writes the changelogs.
2. `pnpm check && pnpm lint:pkg` must pass.
3. Merge into `main` and merge `main` back into `develop`.
4. The push to `main` runs the [release workflow](./workflows/release.yml). It publishes every version the registry does not have yet under `@hlang-org/*` and the identical `@hlang-tech/*` mirror, tags each one, and creates its GitHub Release from the changelog. npm trusts the workflow (trusted publishing), so no token or one-time password is needed, and every version carries a provenance attestation. The same push deploys the website.

Packages at `0.x` (the Lumen editor packages) can change their API in a minor release.

## Reporting issues

Use the issue templates. Report security problems privately, as described in [SECURITY.md](../SECURITY.md).

## Code of conduct

Participation is governed by the [Code of Conduct](../CODE_OF_CONDUCT.md).
