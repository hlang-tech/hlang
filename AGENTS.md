# AGENTS.md — hlang monorepo

Instructions for AI coding agents (Codex, Cursor, Copilot, Claude Code, Windsurf,
Aider, Zed, …). This is the cross-tool source of truth. The nearest `AGENTS.md`
to an edited file wins; an explicit user instruction overrides everything here.

hlang is an FBP-inspired, RxJS-native reactive computation engine and a visual
programming language built on top of it. Read `README.md` for the public pitch.

---

## Non-negotiable engineering bar

These are hard rules. If a change cannot meet them, the design is wrong — stop
and fix the design, do not lower the bar.

- **Correctness is the precondition for everything else.** Quality, elegant
  architecture, and clean code matter ONLY on top of behavior that actually
  works. A beautiful refactor that breaks a feature is a regression, not
  progress. Before claiming a change is done, verify the FEATURE end-to-end
  (drive the real flow and observe the real outcome), not just that types/lint
  pass or that a class was toggled. If you refactor, the behavior must be
  identical afterward — prove it.
- **Zero `any`.** New packages compile under `strict` + `noImplicitAny: true` +
  `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. Opaque values are
  `unknown`, never `any`. No `@ts-ignore` / `@ts-expect-error` to silence a real
  type error.
- **No tricks, no workarounds.** If the code needs a hack to work, the
  architecture is not good enough — fix the architecture. Specifically banned:
  reaching around a public API to touch another layer's internals; global
  `document.querySelector` into another library's private DOM/CSS class names;
  monkey-patching; casting through `unknown`/`as` to defeat a type instead of
  modeling it. A single, documented boundary cast to adapt an external library's
  loose types is acceptable **only** at that one boundary, with a comment saying
  why.
- **No hardcoding.** No magic node ids, no baked-in graph shapes, no
  environment-specific paths or values in library code. Behavior is driven by
  data and injected configuration. Constants that are genuinely fixed (e.g. the
  `@node/error` port name) live as named exports, not inline literals scattered
  around.
- **TDD, failing-test-first**, for logic packages (see testing policy). Never
  weaken or skip a test to make a build pass; fix the root cause.
- **Lint 0 error / 0 warning.** ESLint (flat config, `typescript-eslint`
  type-checked rules). Do not disable a rule globally to dodge a finding; if a
  rule is a genuine false positive, scope the disable to the exact lines with a
  comment explaining why it is safe.
- **Report outcomes honestly.** If tests fail, say so with output. If a step was
  skipped, say that. Never claim "done" without verifying.

Language: conversation with the maintainer is in Chinese; **all code, comments,
identifiers, docs, and commit messages are in clear, industrial-grade English.**

Code is the only source of truth: when working against a dependency or a
reference framework, read its actual source / `.d.ts`, not its docs.

---

## Architecture & layer boundaries (strict, one-directional)

```text
runtime      @hlang-org/runtime      RxJS reactive engine (R/T/W nodes, Flow)   CommonJS, stable 1.x
ir           @hlang-org/ir           IGraph types + planGraph (validate, lower)  zero dependencies
interpreter  @hlang-org/interpreter  executes the plan in-process (RxJS-native)  depends on ir, runtime
compiler     @hlang-org/compiler     prints the plan as an ES module (ESTree)    depends on ir only
editor-core  @hlang-org/editor-core  HEADLESS editor logic (DI, model, commands) depends on ir, interpreter (exec seam)
editor-react @hlang-org/editor-react React bindings; the ONLY layer importing @xyflow/react in the STATE path
editor-ui    @hlang-org/editor-ui    design-system components (built on editor-react)
examples/editor-react-playground     the single, temporary verification app (Vite). NOT a product.
```

**One front end, two backends.** Execution semantics are defined once, in
`planGraph` (`@hlang-org/ir`). The interpreter executes the plan; the compiler
prints the same plan. Never add a semantic rule to only one backend. The
compiler's parity test runs one graph through both and compares the results;
keep it passing.

Dependencies point downward only, never upward or sideways in violation of:

- **editor-core is headless.** It must not import React, `@xyflow/react`, or any
  DOM/RxJS symbol in its public surface. RxJS stays behind the interpreter seam.
  It is unit-testable with no DOM.
- **editor-react is the binding layer.** It maps editor-core state to React Flow
  and back. `EditorEdge.source` is an OUTPUT (O) port → React Flow
  `source`+`sourceHandle` and IGraph `Output`; `EditorEdge.target` is an INPUT
  (I) port → `target`+`targetHandle` and IGraph `Input`. This direction is
  load-bearing; never invert it.
- **editor-ui is presentation.** It renders React Flow primitives (that is its
  job) but must not reach into React Flow's private DOM globally. Node/edge
  visual state is driven through props / a subscribed store keyed by id, not by
  scanning `document` for `.react-flow__*` classes.
- **AI/media specifics do not live in editor-ui.** editor-ui is a generic,
  embeddable node editor. Anything that must know "this is an image / video /
  model" belongs in the host application and plugs in through editor-ui's extension
  registries — editor-ui never imports it.

Mutations to the graph go through `ICommandService` (so undo/redo/validation are
never bypassed) — never mutate `IGraphModel` directly from UI code.

---

## hlang semantics that constrain all layers

- Three node kinds: **R** (Readable/source: out ports + `@node/error`),
  **T** (Transform: in + out + `@node/error`), **W** (Writable/sink: in only,
  NO error port). Enforce this everywhere (descriptors, validation, rendering).
- Ports are RxJS streams (`send`=next, `receive`=subscribe). Connections are
  living streams, not static wires — the engine is reactive/live, not batch.
- Wiring is strictly `O.connect(I)`; the runtime throws otherwise. The connection
  validator must reject wrong-direction links and must ALWAYS allow T↔T cycles
  (feedback is a first-class feature).
- Multi named ports are first-class. `@node/error` is an O port, source-only.
- IGraph is hlang's portable JSON IR — keep editor output IGraph-compatible so
  the same graph can be interpreted or compiled.

---

## Packaging (2026 dual ESM+CJS)

New library packages ship dual **ESM + CJS** built with `tsup`
(`format: ['cjs','esm']`, `dts: true`). Use an `exports` map with per-condition
`types` and explicit extensions (`.js` CJS / `.mjs` ESM); keep `main`/`module`/
`types` for legacy. Gate publishing with `publint` + `@arethetypeswrong/cli
--pack` (target: attw "No problems found"). CSS in editor-ui ships via an
aggregated `styles.css` (import `@hlang-org/editor-ui/styles.css` once) — the
per-component `import './x.css'` statements are compiled to no-ops.

The monorepo uses **pnpm workspaces** (`pnpm-workspace.yaml`: `packages/*`,
`examples/*`), **Turborepo** for the task graph (`turbo.json`), and
**Changesets** for versioning. Internal dependencies use the workspace protocol
(`workspace:^` in libraries, `workspace:*` in private examples) — never `file:`
or registry ranges for a package that lives in this repo. pnpm links one copy of
each dependency version, so `react` / `@xyflow/react` are single instances
without dedupe or alias configuration. The pnpm version is pinned by
`packageManager` in the root `package.json`; Node by `.nvmrc`.

`@hlang-org/runtime` still ships CommonJS only. Vite consumers must opt it into
CommonJS conversion (`optimizeDeps.include` + `build.commonjsOptions.include`),
as `examples/editor-react-playground/vite.config.ts` does.

---

## Commands

Run from the repository root (Turborepo builds dependencies first):

- `pnpm install` — install and link the whole workspace.
- `pnpm build` — build every package (tsup: dual ESM+CJS + dts).
- `pnpm typecheck` — `tsc --noEmit`; must be clean (proves zero-`any`).
- `pnpm lint` — ESLint; must be 0/0.
- `pnpm test` — jest (ts-jest).
- `pnpm check` — build + typecheck + lint + test; the CI gate.
- `pnpm lint:pkg` — publint + attw (package-publish validation).
- `pnpm lint:docs` — markdownlint for the documentation; must be 0/0.
- `pnpm changeset` — record a release note for a published package change.
- `pnpm dev:playground` — the maintainer's dev server (builds dependencies first).

Scope any task to one package with `--filter`, e.g.
`pnpm --filter @hlang-org/editor-core test`.

The maintainer starts the example dev server themselves. Do NOT auto-launch a
dev server on their behalf. For visual verification use `vite build` or a
temporary server on a non-default port, and never occupy port 5173.

---

## Testing policy — test behavior, not pixels

- **ir, interpreter, compiler, editor-core**: unit tests (pure logic,
  deterministic). Required, failing-test-first. Near-100% on pure logic. The
  compiler additionally runs compiled programs in a child process and compares
  them with the interpreter (parity).
- **editor-react**: behavior tests (hook logic + mapping direction via
  `renderHook`) — NOT pixels. These guard the load-bearing bindings.
- **editor-ui**: NO component/pixel tests. It is presentation — verified end to
  end via the example app in a browser. It may unit-test pure logic (`*.spec.ts`,
  node env) and interaction hooks the browser harness cannot drive
  (`*.spec.tsx`, opted into jsdom per file). Its gate is build + lint +
  typecheck + those tests.
- Never disable/skip a test to go green. A failing test is a real signal.

---

## Git workflow and releases

git flow: `main` holds released code (every commit is a release), `develop`
holds the next release. Work on `feature/<topic>` from `develop`; prepare
releases on `release/<version>`; fix releases on `hotfix/<topic>` from `main`.
Pull requests target `develop` (hotfixes target `main`). Commit messages use
Conventional Commits in English.

Every change to a published package needs a changeset. Releases publish the
`@hlang-org/*` packages with Changesets, then mirror identical builds to the
`@hlang-tech/*` scope. Both scopes always carry the same versions. Semver is
binding: never ship a breaking change to existing users without a major
version and a migration guide.

---

## Do-not-touch

- `packages/runtime` is the stable 1.x engine with its own looser config.
  Change it only when explicitly asked, without breaking its public API.
- Do not commit or push unless asked. Never work directly on `main` or
  `develop`; branch first.
