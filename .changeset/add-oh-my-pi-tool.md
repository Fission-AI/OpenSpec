---
"@fission-ai/openspec": patch
---

Add Oh My Pi (`omp`) as a supported tool. Oh My Pi discovers Agent Skills from
`.omp/skills` (`/skill:<name>`) and file-based slash commands from `.omp/commands`
(`/opsx-<name>`), so it registers with `skillsDir: '.omp'` plus a command adapter
that writes `.omp/commands/opsx-<id>.md`.
