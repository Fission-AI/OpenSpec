## Why

Bulk validation currently prints one result for every item in scope, including clean items. That complete report is useful for audit and automation, but it can dominate agent context and CI logs in large, mostly-clean repositories. In one real 895-change archive, the complete JSON report was 157,396 bytes while a feasibility candidate's projected-v1 envelope was 6,740 bytes (95.7% smaller) with all 19 failures and the same exit status. The proposed envelope is different and may have a slightly different byte count; savings vary with issue density. This is evidence about output volume, not validation runtime.

## What Changes

- Add an opt-in `--report <full|findings>` mode to explicit bulk validation scopes: `--all`, `--changes`, `--specs`, and `--archived`.
- Keep the current human and JSON output unchanged when `--report` is omitted or set to `full`.
- In findings mode, project complete item records whose `issues.length > 0` into `itemFindings`, preserving full-report order, every issue severity, and all current or future additive item fields.
- Give JSON findings an exact `report.kind: "validation-findings"` discriminator and its own version. It does not reuse the full-v1 `items` field or claim conformance with that document.
- Keep top-level advisories distinct from item findings and explicitly name any such sections that exist after the required implementation rebase.
- Require an explicit, non-conflicting bulk scope for either report value. Invalid JSON/report combinations return one stable structured diagnostic before root selection, prompts, spinners, or validation.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-validate`: Add a compatibility-safe, opt-in findings report for bulk human and JSON validation output.

## Impact

- **Public CLI:** one additive report option on bulk `openspec validate`; no default behavior change.
- **JSON consumers:** the existing full-v1 complete-`items` document remains unchanged. Consumers choosing findings mode parse a separately identified schema with `itemFindings`.
- **Documentation and completions:** document the two report modes, their scope rules, and the findings JSON envelope; register `--report` on the existing Bash, Zsh, Fish, and PowerShell completion surfaces, with fixed `full`/`findings` value suggestions only in Zsh and Fish.
- **Implementation follow-up:** validation command output, CLI option registration, completions, and focused tests. No new dependency or project-level preference is proposed.
