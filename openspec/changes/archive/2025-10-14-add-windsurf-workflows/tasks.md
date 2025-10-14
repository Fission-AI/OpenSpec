## 1. CLI wiring
- [x] 1.1 Add Windsurf to the selectable AI tools in `openspec init`, including "already configured" detection.
- [x] 1.2 Register a `WindsurfSlashCommandConfigurator` that writes workflows to `.windsurf/workflows/` and ensures the directory exists.
- [x] 1.3 Ensure `openspec update` pulls the Windsurf configurator when winds is selected and skips creation when files are absent.

## 2. Workflow templates
- [x] 2.1 Reuse the shared proposal/apply/archive bodies, adding Windsurf-specific headings/description before the OpenSpec markers.
- [x] 2.2 Confirm generated Markdown (per file) stays comfortably under the 12k character ceiling noted in the Windsurf docs.

## 3. Tests & safeguards
- [x] 3.1 Extend init tests to assert creation of `.windsurf/workflows/openspec-*.md` when Windsurf is chosen.
- [x] 3.2 Extend update tests to assert existing Windsurf workflows are refreshed and non-existent files are ignored.
- [x] 3.3 Add regression coverage for marker preservation inside Windsurf workflow files.

## 4. Documentation
- [x] 4.1 Update README (and any user-facing docs) to list Windsurf under native slash/workflow integrations.
- [x] 4.2 Call out Windsurf workflow support in release notes or CHANGELOG if applicable.
