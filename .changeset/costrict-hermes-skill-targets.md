---
"@fission-ai/openspec": patch
---

CoStrict now loads OpenSpec skills. CoStrict reads project skills from `.agents/skills/`, `.claude/skills/` and `.roo/skills/`, but OpenSpec wrote them to `.cospec/skills/`, which it never reads, so CoStrict users were relying on commands alone. Skills now install to the shared `.agents/skills/` folder, and `openspec update` moves an existing install's skills there. CoStrict's commands stay in `.cospec/openspec/commands/`, the only place it reads them, and CoStrict's own files in `.cospec/` are never touched. If another tool already owns `.agents/skills/`, its copy is kept and the old `.cospec/skills/` copy is left for you to review.

`openspec update` no longer re-syncs a tool on every run when it shares a skills folder that another tool owns and its old folder holds a customized skill. This affected Antigravity alongside Codex, and would have affected CoStrict too.

The Hermes setup note is current: Hermes v2026.6.5 and later load a project's `.hermes/skills/` once you run `hermes skills trust` in it. The `skills.external_dirs` step is now given only for older versions.
