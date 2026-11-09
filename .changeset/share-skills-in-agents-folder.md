---
"@fission-ai/openspec": major
---

Every tool's skills are now written once, to `.agents/skills/`, instead of a copy per tool. Tools that don't read that folder (Claude Code, Continue, ForgeCode, Kiro, CodeBuddy, EasyCode, iFlow, CodeArts, Lingma, GigaCode, Veai, Rovo Dev, Code Studio, Hermes) get a link to each skill in their own `skills/` folder, or a plain copy where a link can't be made. Skills now name each other by skill name (`openspec-propose`), which is right in every tool; commands and the hints init prints keep each tool's own syntax. `openspec update` moves existing projects over: untouched per-tool copies are removed or replaced by a link, and anything you edited, or an `openspec-*` skill of your own already in `.agents/skills/`, is kept and reported. To use a tool that isn't listed, link its folder to `.agents/skills/` (see Supported tools).
