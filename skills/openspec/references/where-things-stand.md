# Where things stand

Use this when the user asks where things stand or what to do next. Look before you answer:

- `openspec list --json` lists the changes in progress.
- `openspec status --change "<name>" --json` shows which parts of a change's plan exist and what comes next. `openspec status --all --json` does this for every change.
- `openspec show "<name>"` prints a change or a spec.
- If the user names a store, add `--store <id>` to each of these. `openspec store list --json` lists the stores.

Say where things stand in a sentence or two, name the next step and the skill that does it, and offer to do it. Do not start it until they say so.
