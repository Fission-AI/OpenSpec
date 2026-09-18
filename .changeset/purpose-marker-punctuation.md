---
'@fission-ai/openspec': patch
---

Fix `validate --strict` reporting `PURPOSE_IS_PLACEHOLDER` for a Purpose that opens with the ordinary word "Todo" followed by prose, as in Spanish ("Todo el…") and Portuguese ("Todo o…") specs ([#1897](https://github.com/Fission-AI/OpenSpec/issues/1897)).

- A leading `TBD`/`TODO` now only counts as a placeholder marker when it is followed by the end of the Purpose, a line break, or marker punctuation (`TODO:`, `TODO -`, `TBD.`), never by prose.
