# Inventory: Smoother setup

One row per change. This is the "where does each piece stand" view. The status
column comes from `openspec list` — run it to see the live numbers.

| # | Change | What it does | Status |
|---|--------|--------------|--------|
| 1 | simplify-skill-installation | Fewer default skills, so the first run is quick | Done |
| 2 | fix-opencode-commands-directory | Use the folder OpenCode expects for commands | Done |
| 3 | add-global-install-scope | Let users choose where tools install | In progress |
| 4 | schema-alias-support | Let `spec-driven` and `openspec-default` both work | Planned |

See live status any time:

```
openspec list --changes
```

Open any change to see its full plan:

```
openspec show simplify-skill-installation
```
