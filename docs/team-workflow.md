# OpenSpec on a Team

Everything in the other guides works the same whether you're solo or on a team of twenty. What changes on a team is the questions around the edges: where do the specs live, how do teammates review a plan, and how does any of this fit the pull-request flow we already have?

The short answer: a change is just files, and OpenSpec never touches git. So it fits your existing workflow instead of replacing it. This page spells out the conventions that work well.

## One rule: OpenSpec doesn't touch git

OpenSpec reads and writes plain Markdown under `openspec/`. It never commits, branches, pushes, or pulls in your project — and it never clones or syncs a [store](stores-beta/user-guide.md) on its own. That means:

- **You commit `openspec/` like any source.** Specs, active changes, and the archive are part of your project's history. (Yes, commit the whole folder — see the [FAQ](faq.md#should-i-commit-the-openspec-folder-to-git).)
- **A change is a folder you version like code.** `openspec/changes/add-dark-mode/` is just files on a branch.
- **Everything below is convention, not enforcement.** OpenSpec won't make you do it this way; it just fits cleanly.

## The everyday loop

The workflow that works well maps a change onto a branch and a pull request:

```
git switch -c add-dark-mode        start a branch, as usual
   │
/opsx:propose add-dark-mode        draft the plan (proposal + specs + tasks)
   │
REVIEW THE PLAN                    you read it before any code — see Reviewing a Change
   │
/opsx:apply                        build it; artifacts + code change together
   │
git commit && open a PR            the PR contains the spec delta AND the code
   │
teammate reviews, merges
   │
/opsx:archive                      fold the delta into specs/, move the change to archive/
```

The plan and the code live side by side in the same branch, so your teammates review both together, and six months later the archived spec still explains why the code looks the way it does.

## Reviewing specs in a pull request

This is where a team feels the payoff. When a PR includes the change's delta spec, the reviewer gets something a raw diff never gives them: **a plain-language statement of what this change is supposed to do**, before they read a single line of code.

A good review order for the reviewer:

1. **Read `proposal.md`** — is this the right problem and scope?
2. **Read the delta under `specs/`** — is "done" defined correctly? (This is the [Reviewing a Change](reviewing-changes.md) two-minute pass, now happening in the PR.)
3. **Then read the code diff** — does it deliver exactly those requirements?

A reviewer who disagrees with the *approach* can say so against the proposal, cheaply, instead of relitigating it across 300 lines of code. Put the delta spec near the top of the PR description, or point reviewers at the change folder, so they start there.

## When to archive

Archiving folds a change's deltas into your main `openspec/specs/` and moves the change folder to `openspec/changes/archive/YYYY-MM-DD-<name>/`. Because `specs/` is the **shared source of truth**, the timing matters on a team. Two workable conventions:

- **Archive after the PR merges (recommended).** The branch carries the active change; once it's merged to your main branch, archive there (often a tiny follow-up commit or a scheduled cleanup). This keeps the shared `specs/` moving forward only with work that actually shipped.
- **Archive inside the PR.** Simpler for small teams: the same PR that adds the code also syncs and archives. The tradeoff is that your `specs/` diff and your code diff land together, which can make the PR noisier.

Pick one and be consistent. Either way, `/opsx:archive` checks that tasks are complete and offers to sync first, so nothing merges half-finished by accident.

## Two people, parallel changes

Because changes are separate folders, they don't collide:

- **Different changes, different people — no problem.** `add-dark-mode` and `rate-limit-login` are different folders on different branches; they never touch each other until they both archive.
- **One change, one owner.** Two people editing the same change folder conflict exactly like two people editing the same file. Keep a change to a single author, or split it into two changes (another reason to [right-size](writing-specs.md#right-size-the-change)).
- **The one place conflicts show up is `specs/`.** If two changes both modify the *same* requirement, archiving the second one will conflict in `openspec/specs/…/spec.md` — resolve it like any merge conflict, keeping the requirement that reflects reality. This is rare, and it's a feature: it's git telling you two changes disagreed about how the system should behave.

## When planning outgrows one repo

Everything above assumes the plan lives in the code repo's own `openspec/` folder, which is the right default. When your planning genuinely spans several repos or teams — one feature touching three services, or requirements one team owns and others consume — that's what the beta **stores** feature is for: planning gets its own repo that any code repo can point at. Start with the [Stores User Guide](stores-beta/user-guide.md).

## Where to go next

- [Reviewing a Change](reviewing-changes.md) — the review pass, now inside your PR.
- [Writing Good Specs](writing-specs.md) — including how to right-size a change so it fits one branch.
- [Stores User Guide](stores-beta/user-guide.md) — planning that spans repos and teams.
