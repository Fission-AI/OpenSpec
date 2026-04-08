## Context

EnpalSpec is a fork of OpenSpec. The fork introduced a new binary (`enpalspec`), a new default schema (`enpal-spec-driven`), and a curated `core` profile. However, two things were left incomplete:

1. The `core` profile still omits `verify`, so `enpalspec init` never generates the verify skill or command for end users — even though the verify template and skill generation wiring already exist.
2. All 11 workflow templates still emit OpenSpec/OPSX-branded content: `openspec <cmd>` binary calls, `OPSX: <Name>` display names, `author: 'openspec'` metadata, and prose referring to "the OpenSpec system". Users who install enpalspec get skills and commands that say OPSX/openspec throughout.

The branding change is purely textual — no logic changes to templates. The profile change is a one-line addition to a constant array. The verify command file for the dev environment is a new file generated from the existing command template.

## Goals / Non-Goals

**Goals:**
- Add `verify` to `CORE_WORKFLOWS` so it is installed by `enpalspec init` by default
- Replace all `openspec <subcommand>` CLI calls in templates with `enpalspec <subcommand>`
- Replace `OPSX: <Name>` command display names with `EnpalSpec: <Name>`
- Replace `author: 'openspec'` and `compatibility: 'Requires openspec CLI.'` metadata
- Replace "OpenSpec system" / "OpenSpec artifacts" prose in templates with "EnpalSpec"
- Update `apply-change` template completion message to point to `verify` before archive
- Create `.claude/commands/enpalspec/verify.md` for dev-environment dogfooding

**Non-Goals:**
- Renaming skill directory names (`openspec-explore`, `openspec-apply-change`, etc.) — these are filesystem identifiers tracked in constants across `init.ts`, `tool-detection.ts`, `profile-sync-drift.ts`, and `skill-generation.ts`; renaming would require a coordinated migration
- Renaming the `openspec/` directory on disk — this is the storage convention used by the CLI
- Changing file paths in templates (`openspec/changes/`, `openspec/specs/`) — these refer to the actual on-disk structure

## Decisions

**Decision 1: Add `verify` between `apply` and `archive` in `CORE_WORKFLOWS`**

`CORE_WORKFLOWS` in `src/core/profiles.ts` is a `const` array. Adding `'verify'` is a one-liner. The skill template entry and command template entry for `verify` already exist in `skill-generation.ts` — they are just filtered out because `verify` isn't in `CORE_WORKFLOWS`. No new wiring needed.

Position `['propose', 'explore', 'apply', 'verify', 'archive']` — verify sits between apply and archive, matching the intended workflow narrative.

**Decision 2: Binary calls — `openspec` → `enpalspec` in all templates**

Every template uses `openspec list`, `openspec status`, `openspec instructions`, `openspec new change`, etc. These call the actual installed CLI binary. The package.json `bin` field exposes `enpalspec` (pointing to `./bin/openspec.js`). All template binary calls must use `enpalspec`.

Scope: all 11 files in `src/core/templates/workflows/`. Simple find-replace of the binary name in shell code blocks and inline code references within template strings.

**Decision 3: Branding scope — what changes, what doesn't**

Changes:
- `name: 'OPSX: ...'` → `name: 'EnpalSpec: ...'` (command display names, human-readable only)
- `author: 'openspec'` → `author: 'enpalspec'`
- `compatibility: 'Requires openspec CLI.'` → `'Requires enpalspec CLI.'`
- Prose: "OpenSpec system", "OpenSpec artifacts" → "EnpalSpec"
- `## OpenSpec Awareness` section header in explore template → `## EnpalSpec Awareness`

Does not change:
- Skill `name` field values like `'openspec-explore'` — these become the directory name that AI tools use to discover skills. Changing these would break existing installs silently.
- File paths: `openspec/changes/`, `openspec/specs/`, `openspec/explorations/` — on-disk convention

**Decision 4: `apply-change` completion message update**

The skill template completion message currently reads: `"All tasks complete! Ready to archive this change."` Update to: `"All tasks complete! Run /enpalspec:verify before archiving."` This wires verify into the workflow narrative without making it a hard code block.

**Decision 5: `.claude/commands/enpalspec/verify.md` — generate from template**

The dev environment has `explore.md`, `apply.md`, `archive.md`, `propose.md` but no `verify.md`. This file is the dogfooding copy — it's what we use when running enpalspec on itself. Generate it from the `getOpsxVerifyCommandTemplate()` output, applying the same EnpalSpec branding (name, binary calls) that the template itself will emit after the rebrand.

## Risks / Trade-offs

**[Risk] Existing installs have OPSX-branded skills** → Users who already ran `enpalspec init` have skills with old branding. They need to re-run `enpalspec init` to pick up the new content. This is expected behavior — init is idempotent and refreshes existing installations.

**[Risk] Skill dir names staying as `openspec-*` looks inconsistent** → Acceptable for now. The dir names are internal filesystem identifiers; users only see the display names (`EnpalSpec: Apply`) and slash commands (`/enpalspec:apply`). A future change can coordinate renaming the dirs with a migration path.

**[Risk] `verify` is now mandatory in the default flow but archive doesn't hard-require it** → By design. The nudge in apply's completion message is sufficient. Adding a hard gate in archive would be over-engineering for the current use case.

## Open Questions

None — scope is fully resolved from exploration.
