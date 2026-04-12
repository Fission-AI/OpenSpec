## 1. GitHub Action Workflow

- [x] 1.1 Create `.github/workflows/openspec-badge.yml` workflow file
- [x] 1.2 Configure workflow to trigger on push to main branch
- [x] 1.3 Add checkout step with actions/checkout@v4
- [x] 1.4 Configure weAretechnative/openspec-badge-action with metric_types, badge_style, and show_label
- [x] 1.5 Set contents: write permission for the workflow

## 2. README Badge Integration

- [x] 2.1 Add new centered paragraph block after existing badges (line 15)
- [x] 2.2 Add number_of_specs badge with raw.githubusercontent.com URL
- [x] 2.3 Add open_changes badge with raw.githubusercontent.com URL
- [x] 2.4 Add tasks_status badge with raw.githubusercontent.com URL

## 3. Verification

- [x] 3.1 Verify workflow YAML syntax is valid
- [x] 3.2 Verify README markdown renders correctly

## 4. Post-Merge (Project Owner)

> **Note:** These tasks must be completed by the project owner after the PR is merged.
> Badges will appear broken until these steps are done.

- [ ] 4.1 Verify GitHub Actions workflow permissions allow write access (Settings → Actions → General → Workflow permissions)
- [ ] 4.2 Manually trigger or wait for the badge workflow to run on main branch
- [ ] 4.3 Enable GitHub Pages with gh-pages branch as source (Settings → Pages)
- [ ] 4.4 Verify badges display correctly in README
