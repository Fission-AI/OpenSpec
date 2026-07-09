## Context

The upstream layer (roadmap → requirements → changes) has no home in
OpenSpec. The design constraint: give it one without OpenSpec modeling the
team's workflow — every team's is different.

## Goals / Non-Goals

**Goals:** the thinnest possible wrapper; any artifact shape; one repo or
many; one skill; value on first contact for a solo dev AND for an org.

**Non-Goals:** typed upstream artifacts, manifests, file watchers or hook
machinery, sync engines, filesystem-crawling discovery of unknown repos
(a repo becomes known the moment it links a change — never by scanning).

## Decisions

**1. A portfolio of initiatives, plus an evergreen layer.**
`openspec/initiatives/<name>/` — each folder is one finite initiative;
unnumbered top-level files are evergreen artifacts (product, roadmap,
architecture) that outlive every initiative. Why: a store holding one plan
is a demo; a store holding the org's portfolio is an operational surface —
and the two-layer shape mirrors what OpenSpec already is. Specs are what is
true and changes are what is in motion at the code altitude; evergreen
artifacts are what is true and initiatives are what is in motion at the
planning altitude. Work flows down, truth flows up, at both altitudes: when
an initiative completes, syncing the evergreen artifacts is the planning
equivalent of archiving a change into specs. Rejected: keeping the singular
"one plan per root" (too small for orgs) and typed artifacts (freeform is
the point; custom schemas already exist if a team ever wants types).

**2. Changes reference upward: `initiative: <name> | <store-id>/<name>`.**
One line in change metadata; rollup scans for it. One syntax covers solo and
team — no `local` keyword to learn, no precedence question (the store is the
parent; repos are children pointing up). The legacy `initiative:` object
(`{store, id}`) carries the same data and normalizes to `<store>/<id>` on
read, so old metadata keeps working. Rejected: a downward manifest — a
central file invites merge conflicts and goes stale; a folder existing is
what makes an initiative exist.

**3. Deterministic triggers, agent reactions.** Anything that drives a
workflow must be a structured fact derivable from disk — a task flipped, a
change archived, a new change pointing at an initiative — never prose.
`list --initiatives` is the one deterministic rendering of that state; the
skill reads it on entry and proposes what to do about it. Prose stays a
freeform projection; if a workflow ever needs to subscribe to something
inside an artifact, that thing graduates to structure. Progress is always
derived, never recorded in planning artifacts. Why: judgment-per-event is
expensive and unrepeatable; facts-per-event with judgment-per-response is
cheap, auditable, and repeatable — and OpenSpec's task/archive lifecycle
already supplies the facts.

**4. Transitions between roles are pull-based, encoded in folder order.**
Handoffs between roles — PM → Engineering, PM → Design → Engineering, or
any longer chain — are not workflows OpenSpec models; they are the numbered
stage folders themselves, and every chain is handled identically. The rule
is one sentence: read everything lower-numbered, produce what your stage
owes the next one. Upstream documents can be any format (a PRD, an RFC, a
one-pager); position carries the meaning. Why pull: push requires
the upstream author to know the downstream tooling and fires before anyone
has implementation context; pull happens when someone opens the work, with
everything on disk. Rejected: per-role skills (the rule is the same move
from different positions) and typed transition events.

**5. One skill, routed by state.** `openspec-initiatives` looks at what
exists before speaking: no folder → offer to capture the conversation;
folder, no target → summarize the portfolio in a few lines; inside an
initiative → work it. Its moves (ideate from what is on disk, capture,
bounded pushback, decompose into changes born linked, sync the evergreen
layer) end in a short numbered menu computed from state — one option marked
recommended, each wired to a real command. Why: the workflow lives on disk,
so anyone (or any agent) can pick it up; menus beat paragraphs for fatigue.
Rejected: per-stage or per-role skills, and a `new initiative` CLI command —
creating an initiative is `mkdir`, and the skill does it in flow.

**6. Works anywhere.** `--store <id>` resolves through the global registry,
so the rollup answers from any directory, repo or not. With no local root
and no `--store`, `list --initiatives` falls back to the portfolios of
registered stores instead of erroring. Why: the planning layer is the level
above repos; asking it "where does everything stand" should not require
standing in a repo.

## Risks / Trade-offs

- [Scan cost across registered repos] → registries are small; scan is
  per-invocation and read-only.
- [`initiative:` values are unvalidated against real folders] → rollup
  simply finds nothing for a bad value; the skill and `list --initiatives`
  make that visible.
- [Plural shape re-grows toward the deleted initiative machinery] → guarded
  by decision 2: no manifest, no registration, no ids beyond the folder
  name; discovery stays a metadata scan.

## Migration Plan

Additive only. Legacy `initiative:` objects normalize on read; the retired
`plan:` field from this experiment's earlier iteration was never released.

## Open Questions

None blocking. Reactive triggers beyond skill-entry (git hooks, CI) are a
natural next experiment, deliberately out of scope.
