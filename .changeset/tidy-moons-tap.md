---
'@fission-ai/openspec': patch
---

Name the offending index when a `rules:` list is not an array of strings

A rule item containing an unquoted `": "` is valid-looking YAML but parses as a
mapping, so the artifact's whole rule set is dropped with only a stderr warning
naming the artifact. The warning now also names the index and the shape YAML
produced there, plus the quoting fix, so the bad item can be found without
bisecting the list by hand.
