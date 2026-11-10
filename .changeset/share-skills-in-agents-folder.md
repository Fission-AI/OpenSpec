---
"@fission-ai/openspec": major
---

OpenSpec 2.0 installs skills only, in one shared folder. Run `openspec update` in each project to move it over; nothing you edited is deleted. See [Upgrade to 2.0](https://openspec.dev/docs/upgrade-to-2).

- **Skills only.** OpenSpec no longer writes `/opsx:*` command files. Each command has a skill with the same instructions (`/opsx:propose` → `openspec-propose`; invoke it as `/openspec-propose`, or `$openspec-propose` in Codex). `openspec update` removes the command files earlier versions generated, and keeps and lists any you edited.
- **One shared copy.** Skills are written once, to `.agents/skills/`, instead of a copy per tool. Claude Code, Continue, ForgeCode, Kiro, CodeBuddy, EasyCode, iFlow, CodeArts, Lingma, GigaCode, Veai, Rovo Dev, Code Studio and Hermes get a link to each skill in their own `skills/` folder (a plain copy where a link can't be made). Old per-tool copies are removed, or kept and reported if you edited them.
- **`delivery` is retired.** It is still accepted, so older configs and scripts keep working, but it no longer changes anything.
- **Amazon Q Developer is retired:** it can't load skills. `openspec update` removes the files OpenSpec wrote in `.amazonq/` (keeping any you edited), and `--tools amazon-q` now points you to Kiro.
- **Windows:** committed links need `git config core.symlinks true`; otherwise `openspec update` writes plain copies.
