---
"@fission-ai/openspec": minor
---

Add `openspec sync`, which folds a change's delta specs into the main specs without archiving it, and an optional `status: proposed | shipped` field in a change's `.openspec.yaml`.

`openspec sync --check` gates on one property: a change that claims to be shipped has its deltas in `specs/`. A proposed change passes for free, so the check is green as its resting state and red only on a real mistake — unlike a check for "is everything archived?", which is red for the whole life of every open pull request. It reads only files on disk, so a pre-commit hook, a pre-push hook and CI run the same command and agree.

`openspec list --status <state>` filters changes by that field.

Everything here is opt-in and inert by default. The `status` field is absent unless a project writes it, nothing generates it, and `archive` is unchanged.

Designed by [@ixxie](https://github.com/ixxie) in [#1683](https://github.com/Fission-AI/OpenSpec/issues/1683) — the diagnosis that `archive` welds a state transition to a text merge, `shipped ⇒ folded` as a predicate over the working tree, and the standalone `sync` that makes it checkable. This ships a smaller, additive subset of that proposal.
