# How specs change

The main specs (`openspec/specs/`) say what the system does today. A change never edits them directly. It carries delta specs, at `specs/<capability>/spec.md` inside the change, that say what will be different:

| Section | Means | Carries |
|---|---|---|
| `## ADDED Requirements` | new behavior | the full requirement and its scenarios |
| `## MODIFIED Requirements` | changed behavior | the whole requirement as it will read, with every scenario that still holds |
| `## REMOVED Requirements` | behavior that goes away | the name, a **Reason**, and a **Migration** |
| `## RENAMED Requirements` | a new name, same behavior | `FROM:` and `TO:` lines |

The deltas merge into the main specs in the change's last task (with the default schema, "Update the specs"), or at archive, where `openspec archive` merges and validates them for you. To merge them yourself, follow `references/sync.md`.

## Stable IDs

You write a stable ID in square brackets as the first word of each new requirement and scenario heading: `### Requirement: [AUTH-3] Users sign in`, `#### Scenario: [AUTH-3.1] Correct password`. The brackets are what make it an ID; the CLI only reads it. Use the next unused number in that spec, keep an ID when you reword or move a heading, never drop one, and never reuse a removed one. A heading with an ID can be reworded in a MODIFIED block with no RENAMED entry: the merge matches on the ID. A heading without one can gain it in a MODIFIED block, including a bare prefix like `NAV-5 Users sign in` becoming `[NAV-5] Users sign in`. Cite IDs, not names, in tasks, tests and code.

## How requirements get lost

- **A partial MODIFIED.** The merge replaces the whole requirement with the delta's block, so whatever the block leaves out is deleted. Copy the existing requirement whole from the main spec, then edit it. For a separate new behavior, use ADDED.
- **A rename written as REMOVED plus ADDED.** Scenarios get dropped on the way, and readers lose the link between the old name and the new. Use RENAMED, plus MODIFIED if the behavior changes too.
- **A repeated requirement.** A new requirement that restates a promise the spec already makes ("paid invoices are emailed" beside an existing "Sending a receipt") leaves two places to keep in step. Extend the existing requirement with MODIFIED instead, and add a new one only for behavior nothing covers yet.
- **A near-duplicate capability.** `user-authentication` next to `user-auth` splits one behavior across two specs. Reuse the exact existing path.
- **Editing a main spec while a change is open.** The merge finds requirements by ID, then by name, so a renamed or reworded main spec no longer matches the delta. Edit the delta instead; edit a main spec directly only to fix its Purpose.
- **Emptying a spec.** A spec cannot be left without requirements. Retiring a capability takes `retire_capabilities: true` in the change's `.openspec.yaml`.

After writing deltas, run `openspec validate "<change>"`. It catches a MODIFIED block that drops a scenario the main spec still has, or drops a scenario's ID.
