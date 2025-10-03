## Why
Today's flow requires maintainers to merge the changeset PR, cut a tag, and draft the GitHub release by hand. Once the release is published on GitHub our existing automation pushes the package to npm, so the manual work centers on shepherding the release PR, updating version metadata, and keeping GitHub releases in sync with the changelog. Those repeated human steps slow the cycle time and increase the risk that the release/tag documentation falls out of sync with what was actually published to npm.

## What Changes
- Adopt the [changesets/action](https://github.com/changesets/action) workflow so pushes to `main` either open/update a release PR or, when the release PR merge lands, run our publish script automatically with the provided `NPM_TOKEN` and `GITHUB_TOKEN`.【5e2b47†L1-L43】【b9dad5†L13-L37】
- Add a `release` npm script that builds the project and calls `changeset publish`, allowing the action to handle version bumps, changelog commits, and npm publishing in one command.【b9dad5†L13-L21】
- Enable `createGithubReleases` in the action configuration so the workflow drafts GitHub releases from the published packages immediately after publishing.【5e2b47†L21-L38】
- Document the automated release flow, required repository secrets, and how maintainers should handle failed publishes or hotfixes.

## How the Maintainer Flow Changes
| Step | Current process | Future process |
| --- | --- | --- |
| Prepare release | Merge changeset PR, wait for GitHub release automation, then manually draft release notes and tags | Merge changeset PR, the action updates/merges the release PR and handles version bumps automatically |
| Publish npm package | Happens automatically after the GitHub release is published | Continues to happen automatically via `changeset publish`; no manual npm work |
| GitHub release | Maintainers draft releases manually and ensure notes match the changelog | Action creates GitHub releases immediately after publishing, based on changeset information |
| Clean up docs/process | Maintainers follow separate docs describing manual tagging and release steps | Update docs to remove manual tag/release steps and document the automated workflow |

## Impact
- Affected automation: `.github/workflows/release.yml`
- Affected package metadata: `package.json` scripts
- Documentation: `README.md` or `/docs` release instructions
