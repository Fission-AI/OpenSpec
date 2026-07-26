---
"@fission-ai/openspec": patch
---

fix(completion): make the PowerShell completion script parse and load again

The generated `OpenSpecCompletion.ps1` contained 18 empty `switch ($positionalIndex) { }` blocks — emitted for commands whose positionals are all `path`-typed (PowerShell completes paths natively, so those cases produce no clauses). A switch with no clauses is a PowerShell parse error ("Missing condition in switch statement clause"), and PowerShell parses the whole file before running it, so the script never loaded and completions never registered. The generator now skips the positional-index block entirely when no positional produces completions, so the script parses clean (18 → 0 errors) and tab completion works.
