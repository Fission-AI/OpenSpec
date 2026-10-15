---
"@fission-ai/openspec": minor
---

`openspec validate` now warns when a scenario has no WHEN/GIVEN trigger step or no THEN outcome step. A scenario with only AND lines or plain prose still counted as a scenario: it validated, archived, and landed in the main spec, carrying no explicit trigger step and no explicit outcome step. The finding is reported for change deltas and main specs alike, naming the requirement and the scenario. Only `Scenario:`-labeled blocks are checked — an unlabeled `#### Notes` child is prose on purpose — keywords inside fenced examples do not count, and bolded title-case steps (`**When**`, `**Then**`) are accepted. It is a warning, the missing-SHALL/MUST posture: normal validation and archive verdicts are unchanged, and `openspec validate --strict` — which already fails on any warning — now enforces it. The specs instruction says so.
