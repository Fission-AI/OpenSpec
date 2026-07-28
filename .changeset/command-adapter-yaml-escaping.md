---
'@fission-ai/openspec': patch
---

Generated tool command files now carry valid YAML frontmatter for every supported tool. Command names ship as `OPSX: Explore`, and the unquoted `name: OPSX: Explore` that adapters emitted is not parseable YAML — strict parsers rejected the whole file, so the command failed to load. Several adapters also re-implemented their own escaping, and a few interpolated descriptions in raw.

Escaping now lives in one place (`escapeYamlValue` / `formatTagsArray`) and every adapter uses it. String frontmatter values are always double-quoted, which also keeps values like `true`, `null` and `123` from round-tripping as booleans, nulls and numbers. Non-string fields such as `allowed-tools` and `invokable` are unchanged. Expect the first `openspec update` after upgrading to rewrite the frontmatter lines of your generated command files.

Archive workflow guidance also gets two corrections: bulk archive now carries its per-delta include/exclude decisions into execution, so a delta whose implementation was not found is reported as `sync skipped` instead of being synced anyway, and both archive workflows verify the main specs before moving the change directory.
