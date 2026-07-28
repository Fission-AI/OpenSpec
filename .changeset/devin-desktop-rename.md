---
'@fission-ai/openspec': patch
---

**Windsurf is now Devin Desktop.** Windsurf was rebranded on June 2, 2026 and its config directory moved: `.devin/` is the preferred read + write location, `.windsurf/` a legacy read-only fallback that the Devin Local agent does not read at all. OpenSpec follows the rename rather than carrying two ids for one product — the tool id is `devin`, writing `.devin/workflows/opsx-<id>.md` and `.devin/skills/openspec-*/SKILL.md`, and it is detected from either directory.

- `--tools windsurf` still resolves, so existing setup scripts keep working; it now configures `.devin/`.
- If your OpenSpec files are still in `.windsurf/`, `openspec update` explains the rebrand and offers to move them. `--force` and non-interactive runs take the move; declining leaves every file exactly where it is. Only the files OpenSpec generates move — each skill's `SKILL.md` and commands named `opsx-*`. A hand-written Cascade workflow, a reference file you keep beside a `SKILL.md`, a command file you edited, and `.devin/rules/` all stay exactly where they are.
- Devin skills and the getting-started hint reference `/openspec-*` skills rather than `/opsx-*` workflows, because only Devin Desktop reads workflows; the `/openspec-*` form works on both agents. Workflow bodies still use `/opsx-<id>`, the name Devin registers for a workflow file.
