---
"@fission-ai/openspec": patch
---

Teach the generated guidance how to list a project's specs. `openspec list --specs` appeared in no generated skill, command, or artifact instruction, while `openspec list --json` (the in-flight *change* list) appeared throughout, so an agent asked to read the existing specs first enumerated changes instead and reported the step complete against the wrong object. The explore skill and command now list the spec inventory alongside the change list and say which is which, and the spec-driven `proposal` and `specs` instructions name the command where they ask for existing capabilities to be researched and for a delta's path to match an existing one. Fixes #1689.
