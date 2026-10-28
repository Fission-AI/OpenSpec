# How specs change

The main specs (`openspec/specs/`) say what the system does today. A change never edits them directly. It carries delta specs, at `specs/<capability>/spec.md` inside the change, that say what will be different:

| Section | Means | Carries |
|---|---|---|
| `## ADDED Requirements` | new behavior | the full requirement and its scenarios |
| `## MODIFIED Requirements` | changed behavior | the whole requirement as it will read, with every scenario that still holds |
| `## REMOVED Requirements` | behavior that goes away | the name, a **Reason**, and a **Migration** |
| `## RENAMED Requirements` | a new name, same behavior | `FROM:` and `TO:` lines |

The deltas merge into the main specs in the change's last task (with the default schema, "Update the specs"), or at archive, where `openspec archive` merges and validates them for you. To merge them yourself, follow `references/sync.md`.

## How requirements get lost

- **A partial MODIFIED.** The merge replaces the whole requirement with the delta's block, so whatever the block leaves out is deleted. Copy the existing requirement whole from the main spec, then edit it. For a separate new behavior, use ADDED.
- **A rename written as REMOVED plus ADDED.** Scenarios get dropped on the way, and readers lose the link between the old name and the new. Use RENAMED, plus MODIFIED if the behavior changes too.
- **A promise stacked onto another.** A new obligation added to an existing requirement makes it longer and harder to change. Ask whether the change is a new promise or a change to one the spec already makes: a new promise gets its own requirement and scenarios; MODIFIED changes what an existing promise says. Never add a requirement that restates a promise the spec already makes.
- **A near-duplicate capability.** `user-authentication` next to `user-auth` splits one behavior across two specs. Reuse the exact existing path.
- **Editing a main spec while a change is open.** The merge finds requirements by name, so a renamed or reworded main spec no longer matches the delta. Edit the delta instead; edit a main spec directly only to fix its Purpose.
- **Emptying a spec.** A spec cannot be left without requirements. Retiring a capability takes `retire_capabilities: true` in the change's `.openspec.yaml`.

## Writing a delta

- Write each requirement and scenario as the system will be once the change is merged, not relative to today ("as before", "no longer"): the delta becomes the main spec.
- Under MODIFIED, keep every existing scenario's heading exactly as it is and change only its steps; a renamed heading reads as a dropped scenario.

After writing deltas, run `openspec validate "<change>"`. It catches a MODIFIED block that drops a scenario the main spec still has.
