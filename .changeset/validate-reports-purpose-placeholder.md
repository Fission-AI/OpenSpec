---
"@fission-ai/openspec": patch
---

`openspec validate` now reports a `## Purpose` that is still the placeholder archive writes for a new capability, instead of passing it. The placeholder is longer than the 50-character brevity floor, so until now the one check meant to catch a Purpose nobody wrote was satisfied by the exact text saying nobody wrote one — a spec whose Purpose read `Does stuff.` failed `--strict` while a spec whose Purpose said nothing at all passed. A capability could carry the placeholder indefinitely while every command reported success.

It is a warning, so a project that already has placeholders on disk keeps validating by default and only `--strict` fails. The message says to edit the main spec directly, since a `## Purpose` in a delta is read only when the capability is created and cannot replace an existing one.

Detection is narrow. The placeholder archive generates is recognised through the same definition that writes it, wherever it appears in the Purpose. Otherwise only a `TBD` or `TODO` opening the Purpose counts, so `The retry budget is TBD pending benchmarks` is still a valid Purpose and a word like `TBDs` is not a marker. Fenced code inside the Purpose is quoted material rather than the Purpose speaking, so a spec that documents the placeholder keeps passing. An empty Purpose is unchanged, and a Purpose reported as a placeholder is no longer also reported as too brief, so a bare `TBD` yields one finding rather than two.

`openspec archive` is unaffected: it validates rebuilt specs without `--strict`, so a spec archive writes still passes the validation it would have passed before, and the text archive writes is unchanged.
