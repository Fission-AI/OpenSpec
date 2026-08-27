---
name: release-openspec
description: >-
  Use this skill when releasing OpenSpec: audit merged work and changeset
  coverage, decide whether a catch-up changeset PR is needed, prepare or resume
  the Changesets Version Packages PR, cut a beta or stable release, verify
  publishing, and polish GitHub release notes. Also use when asked whether an
  open release PR is complete, what the next release step is, or to continue a
  release paused for human approval.
---

# Release OpenSpec

Run the OpenSpec release workflow as a resumable state machine. Inspect live GitHub state on every invocation and take only the next safe action. Do not assume an earlier invocation completed.

## Principles

- Treat `Fission-AI/OpenSpec` and `origin/main` as the release source of truth.
- Default to a read-only audit when the user asks for status, readiness, or advice.
- Treat a request to release, prepare a release, continue, or resume as authorization to perform the applicable release actions.
- Preserve the user's checkout. Never discard unrelated changes or switch their current branch just to prepare a changeset.
- Use a temporary worktree from current `origin/main` for release-authored commits when the checkout is dirty or not on `main`.
- Never approve your own PR. Human review is a deliberate gate.
- Treat merge-queue entry as an intermediate state, not a merge. Advance only after GitHub reports `mergedAt` and the commit is present on `main`.
- Never create the automated Version Packages PR manually. The Changesets action owns it.
- Never push an empty commit merely to retrigger CI. Diagnose the failed or missing run first.
- Report URLs, the state reached, and the exact human action needed whenever pausing.

## Know the two PR types

Keep these distinct in output and decisions:

- **Changeset PR**: A normal human-authored PR that adds one or more `.changeset/*.md` files. Prefer adding a changeset to the feature/fix PR; create a catch-up changeset PR only for already-merged work that should be included.
- **Version Packages PR**: The automated `changeset-release/main` PR titled `chore(release): version packages`. Merging or adding changesets to `main` updates this same PR. Merging it publishes the stable release.

An open Version Packages PR does not prohibit a catch-up changeset PR. It means a catch-up PR is useful only when the audit finds missing release-worthy work. Once that PR merges, wait for the existing Version Packages PR to update.

## Start with a release audit

1. Verify the repository and tools:
   - Resolve the GitHub repository with `gh repo view --json nameWithOwner,url`.
   - Require authenticated `gh`, `git`, and `pnpm` before write actions.
   - Stop before release mutations if the canonical repository is not `Fission-AI/OpenSpec`.
2. Refresh without modifying the worktree:

   ```bash
   git fetch origin main
   ```

   Do not fetch every tag indiscriminately. This repository may contain a conflicting historical local tag, which can make `git fetch --tags` fail even though `origin/main` fetched successfully.

3. Find the latest stable GitHub release. Exclude drafts and prereleases; do not use `git describe`, because a beta tag may be newer than the stable baseline.

   ```bash
   gh release list --repo Fission-AI/OpenSpec \
     --exclude-drafts --exclude-pre-releases --limit 100 \
     --json tagName,publishedAt \
     --jq 'max_by(.publishedAt) | {tagName, publishedAt}'
   ```

   Ensure that exact stable tag resolves locally before using it as a `git log` boundary. Fetch only that tag if it is missing. If a same-named local tag disagrees with the canonical remote, report the mismatch and use a separately resolved canonical commit; never force-rewrite the user's tag as part of an audit.

4. Find open release-related PRs:

   ```bash
   gh pr list --repo Fission-AI/OpenSpec --state open \
     --head changeset-release/main \
     --json number,title,headRefName,baseRefName,url,reviewDecision,statusCheckRollup
   ```

   Identify the Version Packages PR by `headRefName == "changeset-release/main"`, not title alone. Separately list likely changeset PRs and inspect their files; require positive additions to `.changeset/*.md`. Do not mistake the Version Packages PR's changeset deletions for authored changesets, and do not rely on titles because a feature/fix PR may add release tracking.
5. Read the live release policy in `.changeset/README.md`, pending `.changeset/*.md` files on `origin/main`, and the Version Packages PR body/files when it exists.
6. List first-parent commits since the latest stable tag:

   ```bash
   git log --first-parent --date=short \
     --pretty=format:'%h%x09%ad%x09%s' <stable-tag>..origin/main
   ```

7. Map release-worthy merged PRs to existing changesets. Use PR files and changeset history; do not infer coverage from similar wording alone.
8. Classify the audit as:
   - `missing-tracking`: user-facing work intended for this release lacks a changeset;
   - `awaiting-changeset-review`: a suitable changeset PR already exists;
   - `awaiting-merge-queue`: an approved changeset or Version Packages PR is queued but has not landed on `main`;
   - `awaiting-version-update`: required changesets are on `main`, but the Version Packages PR has not incorporated them;
   - `awaiting-version-review`: the Version Packages PR is current but lacks approval;
   - `ready-to-publish`: the Version Packages PR is current, approved, and green;
   - `publishing`: the Version Packages PR merged but artifacts are incomplete;
   - `needs-finalization`: npm, tag, and GitHub Release exist but notes are still raw;
   - `complete`: package, tag, GitHub Release, and polished notes agree.

Present a compact audit with the stable baseline, proposed version, covered changes, possible omissions, intentionally skipped internal/docs work, open PRs, and next action.

## Decide changeset coverage

Follow `.changeset/README.md` rather than assuming every merged PR needs a changeset.

Include work selected for release tracking, especially:

- new user-facing features or commands;
- notable fixes or hotfixes;
- breaking changes or deprecations;
- user-visible performance improvements.

Normally skip documentation-only work, tests, CI/tooling, and internal refactors. Flag ambiguous user-visible changes instead of silently excluding them. Ask the user only when the ambiguity materially changes release scope or the semantic version; otherwise use best judgment and let PR review be the approval gate.

## Create or continue a changeset PR

Do this only for `missing-tracking`.

1. If an open changeset PR already covers the missing work, reuse it. Inspect its `headRefName`, head repository, and `maintainerCanModify`; fetch that exact head branch from its owning repository into a temporary worktree, make the update there, and push back to the same PR head. Stop if the branch is not writable. Do not create a duplicate PR or replacement branch.
2. Read `.changeset/README.md` immediately before authoring.
3. Only when no suitable PR exists, create a short `changeset-<scope>` branch from current `origin/main`. Use a temporary worktree so the operator's checkout remains untouched.
4. Prefer one changeset per coherent release unit. A single catch-up changeset may summarize several small items selected for the same release.
5. Use the exact package name `"@fission-ai/openspec"`, the highest required semantic bump, only relevant headings, and user-focused descriptions.
6. Validate before pushing:

   ```bash
   pnpm exec changeset status
   ```

7. Commit, push, and open a PR whose body lists the covered merged PRs and explains why the catch-up is needed.
8. Stop after returning the PR URL and request human approval. Do not approve it yourself.

On a later invocation, if the PR is approved and checks are green, merge or enqueue it only when the user asked to continue or complete the release. If GitHub uses a merge queue, inspect `mergeQueueEntry`, queue checks, and `mergedAt`; remain in `awaiting-merge-queue` until the PR actually lands on `main`. Then wait for the Changesets action on `main` to update the existing Version Packages PR. Poll with concise progress updates; do not push an empty commit or another branch update, because that can dismiss approval and restart the queue.

## Validate the Version Packages PR

Before calling it ready:

1. Confirm it targets `main` from `changeset-release/main` and is generated by the expected automation.
2. Enumerate every pending `.changeset/*.md` file on current `main`, excluding `.changeset/README.md`. Verify the PR consumes every one and contains the corresponding changelog content. If any pending changeset should be deferred, stop: remove or revise it through a separately reviewed change and wait for automation to regenerate the Version Packages PR before continuing.
3. Fetch `baseRefOid` and `headRefOid` with `gh pr view`, require `baseRefOid` to equal current `origin/main`, and create clean detached temporary worktrees for both revisions. If the head object is missing locally, fetch the immutable `pull/<number>/head` ref first. Never validate from the operator's current worktree.
4. In the base worktree, run `pnpm exec changeset status --output changeset-status.json` and read the expected package/version from that file. Install locked dependencies in the temporary worktree first if the Changesets CLI is unavailable.
5. Compare the base status and complete pending-changeset set against the head worktree: `package.json`, `CHANGELOG.md`, removed changeset files, PR body, and proposed version must all agree. This is a base-to-head comparison because the head has already consumed the changesets and cannot calculate the pending release itself.
6. Remove the temporary worktrees after validation, then inspect all required checks and review state with `gh pr view` / `gh pr checks`.

If current but unapproved, return the URL and pause for human approval. If approved and green, merge or enqueue only when the user asked to release or continue. With merge queue enabled, do not treat approval, auto-merge enablement, or queue entry as the stable publish trigger; wait for `mergedAt` and confirmation that the merge reached `main`.

## Verify stable publishing

After the Version Packages PR merges:

1. Find the release workflow run for the merge commit and wait for completion.
2. Verify all three artifacts independently:
   - `npm view @fission-ai/openspec@<version> version`
   - remote tag `v<version>` points at the expected commit;
   - `gh release view v<version>` exists and is not a prerelease.
3. If only some artifacts exist, report partial state and resume verification before retrying any publish action. Never republish a version already on npm.
4. Once all artifacts exist, read [references/release-notes.md](references/release-notes.md), polish the GitHub Release, and verify the saved title/body.

## Cut a beta

Only enter this path when the user explicitly asks for a beta or prerelease.

1. Run the same audit and confirm pending changesets produce a next stable version.
2. Explain that beta publishing does not consume changesets or replace the stable Version Packages PR.
3. Trigger the existing `release-prepare.yml` workflow on `main`; do not calculate or set the beta version locally.
4. Verify the workflow-selected version, npm `beta` dist-tag, remote tag, and prerelease GitHub Release.
5. Do not merge the stable Version Packages PR as part of a beta request.

## Handle failures

- For failed CI, inspect the failing check and logs before proposing a rerun or code change.
- For a stale Version Packages PR, first confirm a successful `push` run of `release-prepare.yml` occurred after the latest changeset reached `main`.
- For branch divergence, let the Changesets action update its branch. Do not force-push `changeset-release/main`.
- For a queued PR, inspect merge-group checks and queue state. Do not re-enqueue, update the branch, or rerun unrelated checks while it is progressing normally.
- For a version that already exists on npm, stop and reconcile the tag/GitHub Release rather than incrementing or republishing implicitly.
- For missing GitHub permissions or required review, report the exact gate and URL; preserve the detected state so the next invocation can resume by inspection.

## Completion report

Report:

- released version and stable/beta channel;
- changeset PR and Version Packages PR URLs, when applicable;
- release workflow result;
- npm package, tag, and GitHub Release verification;
- release-notes finalization status;
- any intentionally deferred changes.
