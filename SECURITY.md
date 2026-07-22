# Security Policy

## Reporting a vulnerability

Report privately through [GitHub Security Advisories](https://github.com/Fission-AI/OpenSpec/security/advisories/new). Please don't open a public issue for a suspected vulnerability.

Include what you can: affected version, reproduction steps, and the impact you believe it has. We aim to acknowledge within 3 business days and to ship a fix or a decision within 30 days. Valid reports are credited in the advisory unless you'd rather stay anonymous.

## Supported versions

Fixes ship in the latest published version on npm. Older versions are not patched — upgrade to pick up a fix.

## Threat model

OpenSpec is a local command-line tool. It has no server, no network listener, and no privileged daemon. It reads and writes markdown under the directory you run it in, using paths you supply, with your own user permissions. It sends anonymous usage telemetry, which you can disable with `OPENSPEC_TELEMETRY=0`.

That shapes what is and isn't a vulnerability here:

| In scope | Out of scope |
| --- | --- |
| Code execution triggered by parsing a spec, config, or template file | Reading or writing a file path you passed to the CLI yourself |
| Escaping the directory OpenSpec was pointed at, via untrusted input | Static-analysis findings on file-path joins with no untrusted input |
| Leaking credentials or file contents through telemetry or logs | Vulnerabilities in devDependencies that don't ship in the published package |
| Prototype pollution or injection reachable from a config or spec file | Denial of service against your own machine using your own input |

If you think something sits on the boundary, report it and we'll work it out together.

## Published package contents

The `openspec` npm package publishes `dist/`, `bin/`, `schemas/`, and `scripts/postinstall.js`. Build and test tooling (vite, rollup, vitest, eslint, and their transitive dependencies) is not published. Scanners that read `pnpm-lock.yaml` without separating dependency scope will report advisories for packages that never reach an installed copy of OpenSpec — check the `dependencies` block in `package.json` for what actually ships.

## Automated checks

| Tool | Covers |
| --- | --- |
| [CodeQL](https://github.com/Fission-AI/OpenSpec/security/code-scanning) | Static analysis on every push and pull request to `main` |
| [Dependabot](https://github.com/Fission-AI/OpenSpec/security/dependabot) | Dependency advisories plus weekly update pull requests for the CLI, the docs site, and CI actions |
| Dependency review | Blocks a pull request that introduces a high-severity dependency |
| `pnpm audit` | Blocking on published dependencies, weekly on a schedule, informational for build tooling |
| Pinned actions | Every GitHub Action runs from a commit SHA, so a moved tag cannot change what CI executes |

Alerts are triaged against the threat model above, so a finding in build-only tooling is fixed on the normal update cadence rather than treated as an incident.
