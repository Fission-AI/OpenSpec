---
"@fission-ai/openspec": major
---

OpenSpec 2.0 installs skills only, in one shared folder. Run `openspec update` in each project to move it over. Old command files and old skill copies you edited are kept. An edit inside a skill OpenSpec installs in `.agents/skills/` is replaced, as in 1.x, so save those first. See [Upgrade to 2.0](https://openspec.dev/docs/upgrade-to-2).

- **Skills only.** OpenSpec no longer writes `/opsx:*` command files. Each command has a skill with the same instructions. For example, `/opsx:propose` becomes `openspec-propose`, which you invoke as `/openspec-propose` (`$openspec-propose` in Codex). `openspec update` removes the command files earlier versions generated, and keeps and lists any you edited.
- **One shared copy.** Skills are written once, to `.agents/skills/`, instead of a copy per tool. Claude Code, Continue, ForgeCode, Kiro, CodeBuddy, EasyCode, iFlow, CodeArts, Lingma, GigaCode, Veai, Rovo Dev, Code Studio and Hermes Agent get a link to each skill in their own `skills/` folder (a plain copy where a link can't be made). MiniMax Code is the exception: its skills go to `~/.minimax/skills/`. Old per-tool copies are removed, or kept and reported if you edited them.
- **`delivery` is retired.** It is still accepted, so older configs and scripts keep working, but it no longer changes anything.
- **Amazon Q Developer is retired.** It can't load skills. `openspec update` removes the files OpenSpec wrote in `.amazonq/` (keeping any you edited), and `--tools amazon-q` now points you to Kiro.
- **Windows.** To check out committed links, run `git config --global core.symlinks true` (or clone with `git clone -c core.symlinks=true <url>`) and enable Developer Mode so links can be created. Otherwise each link checks out as a small text file, which `openspec update` replaces with a plain copy of the skill.
