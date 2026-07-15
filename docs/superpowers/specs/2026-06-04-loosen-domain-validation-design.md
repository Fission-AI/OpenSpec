# Design: Loosen Domain Validation + Skill-Side Soft Check

**Date:** 2026-06-04
**Status:** Approved

## Summary

Demote OpenSpec's "domain segments must be lowercase kebab-case" rule from a CLI-enforced constraint to a skill-surfaced recommendation. The CLI accepts any filesystem-safe segment; the openspec-propose / openspec-new-change skills detect non-conforming domains and offer the user an explicit choice (convert / keep as-is / pick different) via AskUserQuestion. AI agents never silently transform user-provided domain literals.

## Motivation

A real-world failure: user asked for domain `Performance/SignificanceManager`. CLI rejected on kebab-case validation. AI silently transformed to `performance/significance-manager` and proceeded — without telling the user. The user only discovered the rename after the change directory was created.

This is the same class of issue as the earlier "silently default to no domain" — AI taking unilateral decisions on behalf of the user when the CLI surfaces a constraint.

The previous fix (mandatory `--domain` enforcement) closed the silent-default loophole. This fix closes the silent-transform loophole, while also acknowledging that the kebab-case rule for domain segments is a project convention, not a technical necessity.

## Design

### CLI: loosen `validateDomainPath`

Today `validateDomainPath` calls `validateChangeName` on each segment, which enforces lowercase kebab-case. Replace with a lenient filesystem-safety check that allows:

- Letters (any case): `a-z`, `A-Z`
- Digits: `0-9`
- Hyphens, underscores: `-`, `_`
- Dots inside a segment (but not as the entire segment)

And rejects:

- Empty segments (double slash `auth//oauth`)
- Pure-dot segments (`.` or `..`)
- Path separators inside a segment (handled by split)
- Whitespace (leading/trailing/internal)
- OS-reserved names (best effort: skip explicit reservation list — let OS surface its own error if user picks one)

`validateChangeName` (used for the leaf change name like `add-login`) **stays strict** because the leaf name is used as a stable identifier in many places.

### Skill: soft kebab-case check + explicit choice

In both `openspec-propose` and `openspec-new-change` skill templates (and their command counterparts), insert a check step before invoking `openspec new change`:

```
If user-provided domain doesn't match /^[a-z0-9-]+(\/[a-z0-9-]+)*$/:
  Use AskUserQuestion to surface:
    - Convert to kebab-case form (compute by replacing CamelCase boundaries
      with hyphens, lowercasing, replacing underscores with hyphens)
    - Use as-is (the user's literal)
    - Pick a different domain

  Pass whichever value the user picks to --domain.
  NEVER convert silently.
```

Add a Guardrail in both skills:

> **Don't silently transform user-specified literals** - When the user provides
> a domain that doesn't match OpenSpec's kebab-case recommendation, present the
> choice via AskUserQuestion (convert / keep as-is / pick different) and let
> the user decide. NEVER lowercase, kebab-case, or otherwise modify the literal
> on your own. (Deriving a kebab-case name from a freeform description like
> "add user auth" is fine — there's no specific literal there to preserve.)

### Cross-platform note

Windows and macOS default file systems are case-insensitive. On those systems, `Performance/` and `performance/` resolve to the same directory and may collide. We don't enforce uniqueness in the CLI (would require maintaining a case-folded index); we rely on filesystem error if the user actually creates a colliding directory. Document the risk in the CLI's mandatory-domain error block:

> Note: domain segments are case-preserving. On case-insensitive file systems
> (Windows, macOS default APFS) different-case variants of the same name will
> collide.

## Affected Files

| File | Change |
|------|--------|
| `src/utils/change-path.ts` | Rewrite `validateDomainPath` to lenient mode |
| `test/utils/change-path.test.ts` | Add cases: `Performance/SignificanceManager` passes, `auth//oauth` still rejected, segments with whitespace rejected, `.` and `..` rejected |
| `src/core/templates/workflows/propose.ts` | Add soft-check step + Guardrail (template + command) |
| `src/core/templates/workflows/new-change.ts` | Add soft-check step + Guardrail (template + command) |
| `test/core/templates/skill-templates-parity.test.ts` | Update SHA-256 hashes for the 4 modified templates + 2 generated skill payloads |
| `src/commands/workflow/new-change.ts` | Append cross-platform note to mandatory-domain error message |
| `test/commands/workflow/new-change-domain.test.ts` | Update existing "rejects invalid domain segment (uppercase)" / "rejects domain with empty segment" tests — uppercase now passes; double-slash still rejects |

## Out of Scope

- Migrating existing changes' domain casing
- Auto-detecting case-collisions across siblings
- Configurable strictness (project-level setting to opt back into strict kebab-case)
- Touching `validateChangeName` for leaf change names

## Testing Notes

The skill changes are tested via the parity hash test (mechanical) — not via subagent pressure scenarios in this iteration, because the user has already done the field-test (RED phase) by reporting the silent-transform failure. The CLI changes are tested via unit tests on `validateDomainPath`.
