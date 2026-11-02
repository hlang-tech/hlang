# Security policy

## Supported versions

Security fixes are released for the latest major version of each package.

| Package | Supported |
| --- | --- |
| `@hlang-org/runtime` | 2.x |
| `@hlang-org/ir` | 1.x |
| `@hlang-org/interpreter` | 2.x |
| `@hlang-org/compiler` | 2.x |
| `@hlang-org/editor-core`, `editor-react`, `editor-ui` | latest 0.x minor |

The same versions published under `@hlang-tech/*` are covered.

## Verifying a release

Every version is published by the [release workflow](.github/workflows/release.yml) through npm trusted publishing, and npm records a signed [SLSA provenance](https://slsa.dev/provenance/v1) attestation that ties it to the commit and workflow that built it. Check the packages you installed with:

```sh
npm audit signatures
```

Each `@hlang-org/*` GitHub Release also carries the tarball it released and that provenance: `<package>-<version>.tgz`, the Sigstore bundle `<package>-<version>.sigstore.json`, and the in-toto attestation inside it, `<package>-<version>.intoto.jsonl`. The attestation's subject is the tarball's SHA-512 digest. Versions published before trusted publishing (the `0.1.x` editor packages, `runtime` 1.0.x, `ir` 1.0.x, `interpreter` 1.0.x, `compiler` 2.0.x and `editor-ui` 0.2.0) have no provenance.

## Reporting a vulnerability

Report vulnerabilities privately through [GitHub security advisories](https://github.com/hlang-tech/hlang/security/advisories/new). Do not open a public issue.

Include the affected package and version, a description of the impact, and steps or a graph that reproduces the problem. You will get an acknowledgement within 7 days. Fixes are released as patch versions, and the advisory is published once a fixed version is available.
