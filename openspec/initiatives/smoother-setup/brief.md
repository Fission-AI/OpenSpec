# Initiative: Smoother setup

> An **initiative** is the home for a big effort: a brief, the artifacts your
> team works from, and the changes that carry it out. This is a real example,
> built from changes already in this repo. See
> [the guide](../../../docs/stores-beta/initiatives.md).

## What this is

The effort to make OpenSpec faster and simpler to set up.

## Why these changes go together

New users should reach a win fast. Each change here removes some setup friction:
fewer skills to learn at first, the right folders for each tool, a clear choice
of where things install, friendlier schema names. Small on their own. Together,
a smoother first run.

## The artifacts this initiative works from

This is the part other tools do not let you do: **the artifact types are ours,
not the tool's.**

- [personas/](personas/) — who we build for
  ([a new user](personas/new-user.md), [a lead across repos](personas/team-lead.md)).
- [decisions/](decisions/) — the calls we made, and the trade-offs, one record
  each ([0001](decisions/0001-aliases-over-rename.md), [0002](decisions/0002-tool-native-paths.md)).
- [example-schema/](example-schema/schema.yaml) — the same three types
  (`brief → persona → decision`) described as a schema, so OpenSpec can check
  them. Illustrative here; it is not in this repo's active schema set.

## The changes it groups

Four real changes carry this initiative. You never track their status by hand —
ask OpenSpec:

```bash
openspec list --changes
```

- `simplify-skill-installation` — fewer default skills, so the first run is quick
- `fix-opencode-commands-directory` — use the folder OpenCode expects
- `add-global-install-scope` — let users choose where tools install
- `schema-alias-support` — let `spec-driven` and `openspec-default` both work

Open any one to read its full plan: `openspec show simplify-skill-installation`.
