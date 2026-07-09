## Why

Big work is bigger than one change, and OpenSpec has no way in above
`propose`. Roadmaps, PRDs, and visions live outside the tool, and the
translation from them into changes is hand-rolled by every serious team.

Initiatives are that way in. OpenSpec owns almost nothing: a folder
convention, one metadata line, one rollup, one skill.

## What Changes

- **A portfolio, not a single plan.** `openspec/initiatives/` holds the
  planning layer for a root — this repo, or a store the team shares.
  - Each subfolder is one **initiative**: a finite piece of work above a
    single change (`smoother-setup/`, `q3-payments/`). Contents are freeform;
    numbered folders inside an initiative are ordered stages, and their
    names are the team's workflow (`00_product/ 01_engineering/`, or any
    longer chain). Stage documents can be any format — a PRD, an RFC, a
    one-pager. Handoffs are pull-based: read what is lower-numbered,
    produce what your stage owes the next.
  - Unnumbered files at the top level are **evergreen artifacts** — the
    standing truths every initiative serves (`product.md`, `roadmap.md`,
    `architecture.md`). They are maintained forever, the way specs are.
- **Changes point up.** One line in a change's `.openspec.yaml` —
  `initiative: <name>` (this root) or `initiative: <store-id>/<name>` (a
  store's initiative). No manifest anywhere. `new change` gains
  `--initiative`. Legacy `initiative:` objects (`{store, id}`) stay readable.
- **One rollup.** `openspec list --initiatives [--store <id>]` shows the
  portfolio: every initiative, every change on this machine pointing at it,
  live task status — including changes in other checkouts. Linking is the
  registration: `new change --initiative <store>/<name>` records the repo's
  path machine-locally so rollups scan it, with nothing written into the
  repo. Run outside any root, it falls back to the portfolios of registered
  stores.
- **One skill.** `openspec-initiatives` (`/opsx:initiatives`): routes by
  what is on disk, captures planning conversations into artifacts, ideates
  from what exists, decomposes into changes born linked, and syncs the
  evergreen layer as work completes. It ends every move in a short numbered
  menu wired to real commands, and it is instructed to write less, not more.
- Referenced stores' initiatives appear in `openspec context` and the agent
  instruction block.

## Capabilities

### New Capabilities
- `initiatives`: the initiatives convention (portfolio + evergreen layer),
  the upward `initiative:` link, the `list --initiatives` rollup, and
  surfacing in context/instructions.

### Modified Capabilities
None.

## Impact

- Commands: `list` (adds `--initiatives`), `new change` (adds
  `--initiative`), `context` and `instructions` (surface a store's
  initiatives; a linked change's instructions open with the initiative it
  serves and its upstream path). All additive.
- Skill set: one new workflow, `initiatives`, in the core profile — the
  documented happy path (`openspec init` → `/opsx:initiatives`) must work
  without extra configuration.
- No breaking changes. Legacy `initiative:` metadata objects normalize to
  the new reference form when read.
