---
"@fission-ai/openspec": patch
---

Reject config key paths that reach the prototype chain, and update the bundled `yaml` dependency.

`openspec config set --allow-unknown __proto__.polluted <value>` reported success and assigned onto `Object.prototype` for the rest of the process. `--allow-unknown` was meant to relax the known-key check only, but it skipped every key check, so `__proto__`, `constructor`, and `prototype` segments reached the nested-write helper. Those segments are now rejected in `config set` whether or not `--allow-unknown` is passed, and `setNestedValue` / `deleteNestedValue` refuse them regardless of caller. Ordinary keys such as `featureFlags.myFlag` behave exactly as before.

The `yaml` runtime dependency moves from 2.8.2 to 2.9.0, picking up the fix for a stack overflow on deeply nested input (GHSA / advisory patched in 2.8.3).
