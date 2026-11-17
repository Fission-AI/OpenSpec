---
"@fission-ai/openspec": minor
---

Add a skill router, `/openspec`: one place to start for anything OpenSpec. Say what you want. It picks the right skill, tells you where your changes stand and what to do next, and can run several steps in a row.

The other skills make fewer mistakes and write better plans:

- **propose**, **ff** and **continue** read the plan back before showing it, and fix artifacts that disagree, scope nobody asked for, and scenarios a test could not check.
- **apply** no longer calls a change done while `openspec validate` fails.
- **archive** and **sync** no longer drop a sentence the main spec gained after the change was planned, and no longer merge stray files under `specs/`.
- Every skill that ends with a report leads with what it did, flags what needs you, and ends with the next step.

Run `openspec update` to get them.
