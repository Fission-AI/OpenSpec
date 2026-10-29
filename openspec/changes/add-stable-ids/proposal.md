## Why

Everything that points at a requirement, scenario or decision points at its heading text. Rewording a heading breaks every link to it, and archive, which matches by name, refuses to archive a renamed scenario (#1697). In epam/ai-dial-chat, about 1 in 4 broken spec links was just a reworded heading.

Teams already work around this by putting an ID at the start of the heading (#1967, #1697, #2157), but OpenSpec treats that ID as ordinary heading text, so a rename still breaks.

## What Changes

- **The agent writes the ID into the heading itself,** in square brackets as its first word: `### Requirement: [AUTH-3] Users sign in` and `#### Scenario: [AUTH-3.1] Correct password`. There's no hidden metadata and no new command.
- **The CLI only reads IDs.** It never assigns, rewrites or removes one. Its whole role is to match on the ID and refuse duplicates (below), and to serve the instructions and templates that tell the agent how to write them.
- **Validate and archive match on the ID before the name.** A rename that keeps its ID archives, and the scenario-loss guard still refuses a dropped ID.
- **Duplicate IDs are refused,** so two parallel changes that pick the same number are caught instead of overwriting each other.
- **Decisions get short, stable IDs** in `design.md`: a `### D1` heading, then the choice and the reason in a sentence or two. Tasks and risks link `[D1](./design.md#d1)`.
- **Templates and instructions show the format,** and ask tests and code to cite the ID rather than the heading text.
- **Specs without IDs behave exactly as before,** including headings that merely start with something like `SHA-256` or `HTTP-2`.

## Capabilities

### New Capabilities

- `stable-ids`: recognizing IDs in spec headings, matching on them in validate and archive, and the ID conventions in the `spec-driven` templates.

### Modified Capabilities

_None._

## Impact

- **Spec authors:** IDs are optional. A project that never writes one sees no change.
- **Projects that already prefix headings with bare IDs** (like `NAV-5` or `REQ-UA-004`): nothing changes until they add brackets (`[NAV-5]`); a MODIFIED block can add them, and renames work from then on. Projects using `[cap-012]` get renames with no migration.
- **Code:** the requirement and scenario parsers, `specs-apply.ts`, the validator, the `spec-driven` schema and its `spec.md` and `design.md` templates, and docs. No new dependency, command, or flag.
- **Skills:** every skill gets the new instructions and templates through `openspec instructions`. #2134 adds the same conventions to the `openspec-beta` guides that don't go through it: the agent-run spec sync, verify, and the decisions guide.
