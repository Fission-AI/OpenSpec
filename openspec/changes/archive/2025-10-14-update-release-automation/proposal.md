## Why
Today’s process requires maintainers to merge the Changesets PR, cut a tag, and draft the GitHub release by hand. npm publish then runs from our existing workflow after the GitHub release is published. The human-in-the-loop steps (versioning, tagging, release notes) slow us down and risk drift between npm, tags, and changelog.

## What Changes
- Use the single `changesets/action` on pushes to `main` to either open/update the version PR or, when the release PR is merged, run our publish command automatically using repository secrets.
- Add a `release` script that builds and runs `changeset publish` so the action handles version bumps, changelog commits, npm publish, and GitHub releases end-to-end.
- Enable `createGithubReleases: true` so GitHub releases are created from the changeset data right after publishing.
- Document the automated flow, required secrets, guardrails, and recovery steps (rollback, hotfixes).

## Two-Phase Rollout (Two PRs)
1) Phase 1 — Dry run (no publish)
   - Update the existing `release-prepare.yml` to wire up `changesets/action` with `createGithubReleases: true` and a no-op `publish` command (e.g., `echo 'dry run'`).
   - Keep `.github/workflows/release-publish.yml` intact. This avoids any publish path changes while we verify that the version PR behavior and permissions are correct.
   - Add a repository guard (`if: github.repository == 'Fission-AI/OpenSpec'`) and a concurrency group for safety.

2) Phase 2 — Enable publish and consolidate
   - Add `"release": "pnpm run build && pnpm exec changeset publish"` to `package.json`.
   - Change `release-prepare.yml` to use `with: publish: pnpm run release` and `env: NPM_TOKEN: \\${{ secrets.NPM_TOKEN }}` plus the default `GITHUB_TOKEN`.
   - Remove `.github/workflows/release-publish.yml` to avoid double-publish. Publishing now happens when the version PR is merged.

## Guardrails
- Concurrency: `concurrency: { group: release-\\${{ github.ref }}, cancel-in-progress: false }` on the workflow to serialize releases.
- Repository/branch guard: run publish logic only on upstream `main` (`if: github.repository == 'Fission-AI/OpenSpec' && github.ref == 'refs/heads/main'`).
- Permissions: ensure `contents: write` and `pull-requests: write` for opening/updating the version PR; `packages: read` optional.

## Rollback and Hotfixes
- Rollback: revert the release PR merge (which reverts version bumps/changelog); if a tag or GitHub release was created, delete the tag and release; deprecate the npm version if necessary (`npm deprecate @fission-ai/openspec@x.y.z 'reason'`).
- Hotfix (urgent, no pending changesets): create a changeset for the fix and merge the release PR; in emergencies, run a manual bump/publish but reconcile with Changesets by adding a follow-up changeset to align versions.

## Required Secrets
- `NPM_TOKEN` with publish rights for the `@fission-ai` scope.
- Default `GITHUB_TOKEN` (provided by GitHub) for opening/updating the version PR and creating GitHub releases.

## How the Maintainer Flow Changes
| Step | Current process | Future process |
| --- | --- | --- |
| Prepare release | Merge changeset PR, then manually draft release notes and tags | Merge release PR; action updates versions and handles changelog automatically |
| Publish npm package | Happens automatically after GitHub release | Happens automatically via `changeset publish` invoked by the action |
| GitHub release | Draft manually and sync with changelog | Action creates GitHub releases from changeset data |
| Docs/process | Follow manual tagging/release steps | Docs describe automated flow + recovery and hotfix paths |

## Impact
- Automation: reuse `.github/workflows/release-prepare.yml` (phase 1: dry-run, phase 2: publish) and remove `.github/workflows/release-publish.yml` in phase 2.
- Package metadata: add `release` script to `package.json`.
- Docs: update README or `/docs` to show the automated flow, secrets, guardrails, and recovery steps.

## Acceptance Criteria
- Phase 1: merges to `main` open/update a version PR; on merge, the action’s `publish` step is a no-op; no npm publish occurs; logs confirm intended behavior; GitHub releases creation is wired but inert due to no publish.
- Phase 2: merges to `main` run `pnpm run release` from the action; npm package publishes successfully; GitHub release is created automatically; `.github/workflows/release-publish.yml` is removed; no duplicate publishes occur.
