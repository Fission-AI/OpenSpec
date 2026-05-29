## Why

The README currently displays CI, npm, license, and Discord badges but lacks visibility into OpenSpec-specific project health metrics. Adding OpenSpec badges will showcase the framework's own capabilities and provide at-a-glance insight into the project's specification coverage and change activity.

## What Changes

- Add a new row of OpenSpec badges to the README header section
- Configure the openspec-badge-action GitHub Action to generate badges
- Display three metrics: number of specs, open changes, and open tasks
- Use classic style with labels for consistency and clarity

## Capabilities

### New Capabilities

- `readme-badges`: Configuration and display of OpenSpec metric badges in project README

### Modified Capabilities

None - this change adds new content to the README without modifying existing OpenSpec behavior.

## Impact

- **README.md**: New badge row added after the existing badges section
- **.github/workflows/**: New workflow file for badge generation
- **gh-pages branch**: Will store generated SVG badge files (created automatically by the action)
- **Repository settings**: Requires `contents: write` permission for the workflow

## Prerequisites for Project Owner

Before the badges will display correctly, the project owner must complete these steps after merging:

1. **Enable GitHub Pages**: Go to repository Settings → Pages → Set source to "Deploy from a branch" and select the `gh-pages` branch (root folder)
2. **Run the workflow**: The badge workflow must run at least once to generate the initial SVG files and create the gh-pages branch
3. **Verify permissions**: Ensure GitHub Actions has write access to the repository (Settings → Actions → General → Workflow permissions → "Read and write permissions")

Until these steps are completed, the badge images in the README will show as broken/missing.
