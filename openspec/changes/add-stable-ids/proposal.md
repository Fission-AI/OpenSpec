## Why

Everything that points at a requirement, scenario or decision points at its heading text. Rewording a heading breaks every link to it, and archive, which matches by name, refuses to archive a renamed scenario (#1697). In epam/ai-dial-chat, about 1 in 4 broken spec links was just a reworded heading.

Teams already work around this by putting an ID at the start of the heading (#1967, #1697, #2157), but OpenSpec treats that ID as ordinary heading text, so a rename still breaks.

## What Changes

- **The `openspec-beta` skills (#2134) generate ID labels,** written in square brackets as the heading's first word: `### Requirement: [AUTH-3] Users sign in` and `#### Scenario: [AUTH-3.1] Correct password`. There's no hidden metadata and no new command.
- **The CLI only reads IDs.** It never asks for, assigns, rewrites or removes one. Its whole role is to match on the ID and refuse duplicates (below).
- **Validate and archive match on the ID before the name.** A rename that keeps its ID archives, and the scenario-loss guard still refuses a dropped scenario or a dropped ID.
- **Duplicate IDs are refused,** so two parallel changes that pick the same number are caught instead of overwriting each other.
- **Default instructions and templates don't change.** Agents using today's skills write exactly what they did before. Decision IDs (`### D1`) are taught by the `openspec-beta` skills alone, and the CLI doesn't read them.
- **Specs without IDs behave exactly as before,** including headings that merely start with something like `SHA-256` or `HTTP-2`.

## Capabilities

### New Capabilities

- `stable-ids`: recognizing ID labels in spec headings, and matching on them in validate and archive.

### Modified Capabilities

_None._

## Impact

- **Spec authors:** IDs are optional. A project that never writes one sees no change.
- **Projects that already prefix headings with bare IDs** (like `NAV-5` or `REQ-UA-004`): nothing changes until they add brackets; a MODIFIED block can turn `NAV-5 Users sign in` into `[NAV-5] Users sign in`, and renames work from then on. Projects using `[cap-012]` get renames with no migration.
- **Code:** the requirement and scenario parsers, `specs-apply.ts`, the validator, and docs. The `spec-driven` schema and its templates are unchanged. No new dependency, command, or flag.
- **Skills:** today's skills are unaffected, because `openspec instructions` returns the same text as before. The `openspec-beta` skills (#2134) write IDs and `### D1` decisions.
