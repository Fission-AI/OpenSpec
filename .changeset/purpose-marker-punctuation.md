---
'@fission-ai/openspec': patch
---

Fix `validate --strict` reporting `PURPOSE_IS_PLACEHOLDER` for a Purpose that opens with the ordinary word "Todo" followed by prose, as in Spanish ("Todo el…") and Portuguese ("Todo o…") specs ([#1897](https://github.com/Fission-AI/OpenSpec/issues/1897)).

- Case now separates the marker from the word. `TBD`/`TODO` in capitals is still a placeholder marker whatever follows it, so `TODO write this later` is still reported.
- In any other case it counts as a marker only when followed by the end of the Purpose, a line break, or marker punctuation (`todo -`, `tbd.`), so an authored Spanish or Portuguese sentence is not reported.
