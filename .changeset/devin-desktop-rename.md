---
'@fission-ai/openspec': patch
---

**Windsurf is now Devin Desktop.** Windsurf was rebranded on June 2, 2026 and its config directory moved: `.devin/` is the preferred read + write location, `.windsurf/` a legacy read-only fallback that the Devin Local agent does not read at all. OpenSpec follows the rename rather than carrying two ids for one product — the tool id is `devin`, writing `.devin/workflows/opsx-<id>.md` and `.devin/skills/openspec-*/SKILL.md`, and it is detected from either directory.

- `--tools windsurf` still resolves, so existing setup scripts keep working; it now configures `.devin/`.
- If your OpenSpec files are still in `.windsurf/`, `openspec update` explains the rebrand and offers to move them. `--force` and non-interactive runs take the move; declining leaves every file exactly where it is. Only OpenSpec's own files move — skills named `openspec-*` and commands named `opsx-*` — so a hand-written Cascade workflow, a reference beside a `SKILL.md`, an edited command file, and `.devin/rules/` are all left alone.
- Devin skills and the getting-started hint reference `/openspec-*` skills rather than `/opsx-*` workflows, because only Devin Desktop reads workflows; the `/openspec-*` form works on both agents. Workflow bodies still use `/opsx-<id>`, the name Devin registers for a workflow file.
