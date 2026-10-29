## Why

Everything that points at a requirement, scenario or decision points at its heading text. Rewording a heading breaks every link to it, and archive, which matches by name, refuses to archive a renamed scenario (#1697). In epam/ai-dial-chat, about 1 in 4 broken spec links was just a reworded heading.

Teams already work around this by putting an ID at the start of the heading (#1967, #1697, #2157), but OpenSpec treats that ID as ordinary heading text, so a rename still breaks.

## What Changes

- **Requirements and scenarios can carry a visible ID** as the first word of the heading: `### Requirement: AUTH-3 Users sign in` and `#### Scenario: AUTH-3.1 Correct password`. The agent writes it. There's no hidden metadata and no new command.
- **Validate and archive match on the ID before the name.** A rename that keeps its ID archives, and the scenario-loss guard still refuses a dropped ID.
- **Duplicate IDs are refused,** so two parallel changes that pick the same number are caught instead of overwriting each other.
- **Decisions get short, stable IDs** in `design.md`: a `### D1` heading, then the choice and the reason in a sentence or two. Tasks and risks link `[D1](./design.md#d1)`.
- **Templates and instructions show the format,** and ask tests and code to cite the ID rather than the heading text.
- **Specs without IDs behave exactly as before.**

## Capabilities

### New Capabilities

- `stable-ids`: recognizing IDs in spec headings, matching on them in validate and archive, and the ID conventions in the `spec-driven` templates.

### Modified Capabilities

_None._

## Impact

- **Spec authors:** IDs are optional. A project that never writes one sees no change.
- **Projects that already prefix headings with IDs** (like `NAV-5` or `REQ-UA-004`): renames start working with no migration.
- **Code:** the requirement and scenario parsers, `specs-apply.ts`, the validator, the `spec-driven` schema and its `spec.md` and `design.md` templates, and docs. No new dependency, command, or flag.
- **Skills:** #2134's decisions guide picks up the matching `### D1` line.
