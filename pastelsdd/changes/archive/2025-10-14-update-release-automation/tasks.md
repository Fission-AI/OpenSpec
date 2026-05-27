## 1. Release workflow automation
- [x] 1.1 Add a `.github/workflows/release.yml` that runs on pushes to `main`, sets up pnpm + Node 20, installs dependencies, and invokes `changesets/action@v1` with `publish: pnpm run release`.
- [x] 1.2 Configure the action with `createGithubReleases: true` and document required secrets (`NPM_TOKEN`, default `GITHUB_TOKEN`) plus recommended concurrency safeguards.
- [x] 1.3 Validate the workflow using `act` or a dry-run push to confirm the action opens release PRs when changesets exist and publishes when the release PR merge lands.

## 2. Package release script
- [x] 2.1 Add a `release` script to `package.json` that builds the project and runs `changeset publish` using pnpm.
- [x] 2.2 Ensure the script respects the existing `prepare`/`prepublishOnly` hooks to avoid duplicate builds and update documentation or scripts if adjustments are needed.

## 3. Documentation and recovery steps
- [x] 3.1 Update maintainer docs (e.g., README or `/docs`) with the end-to-end automated release flow, explicitly removing the manual tag/release steps that are no longer required and explaining how changesets drive the release PR.
- [x] 3.2 Document fallback steps for failed publishes (rerun workflow, manual publish) and the hotfix path when a release must be cut without pending changesets.
