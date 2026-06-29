---
"@fission-ai/openspec": minor
---

Prevent silent spec drop: `openspec archive` and `openspec validate` now share one schema-aware delta gate, so a spec-driven change can no longer archive while leaving `openspec/specs/` stale.

- **Archive blocks silent drops.** When a change's schema produces delta specs, `openspec archive` now refuses (and `openspec validate` reports invalid) for: no delta specs at all (`CHANGE_NO_DELTAS`), a declared capability with no delta spec (partial drop), or a `specs/<cap>/spec.md` written as a full spec instead of a delta (`## ADDED/MODIFIED/REMOVED/RENAMED Requirements`). `--yes` no longer bypasses validation. Use `--skip-specs` (or `--no-validate`) to intentionally archive without specs.
- **Schema-aware (#997).** The delta requirement applies only when the change's schema actually produces delta specs, so proposal-only / lighter schemas now pass `validate` and `archive` without delta specs.
- **Declared-capability coverage.** Every capability listed in a proposal's `## Capabilities` must have a matching `specs/<id>/spec.md`, enforced by `validate` and `archive`.
- **Archive skills call the CLI.** `/opsx:archive` and the bulk-archive workflow now run `openspec archive` (which validates, syncs, and moves) instead of judging sync state and moving files agent-side — so the guarantees above hold for agent workflows too.
- **Apply is enforceable.** `openspec instructions apply` exits non-zero when blocked, and the `spec-driven` apply gate requires `specs`.
- **Recovery.** `openspec validate --archived` audits already-archived changes for capabilities that never reached `openspec/specs/`.
