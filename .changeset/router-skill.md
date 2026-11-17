---
"@fission-ai/openspec": minor
---

Add an `openspec` skill: one place to start for anything OpenSpec. Type `/openspec` and say what you want. It picks the right skill, tells you where your changes stand and what to do next, and can run several steps in a row.

The other skills are shorter and make fewer mistakes:

- **apply** no longer calls a change done while `openspec validate` fails.
- **archive** and **sync** no longer drop a sentence the main spec gained after the change was planned, and no longer merge stray files under `specs/`.
- **propose**, **ff**, **continue** and **update** change a requirement where it lives instead of adding a second one, and keep each requirement to one promise.

Run `openspec update` to get them.
