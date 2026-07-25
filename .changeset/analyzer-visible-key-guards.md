---
"@fission-ai/openspec": patch
---

Compare config key guards literally instead of through a helper.

`setNestedValue` and `deleteNestedValue` rejected prototype-reaching key segments through a helper that did a `Set` lookup. That is correct, but static analysis could not follow it, so CodeQL kept reporting prototype-pollution on the very assignments the guard protects. The segments are now compared literally in the same function, still checked across the whole path before anything is written. Behavior is unchanged for every input, verified against the previous implementation across 400,000 generated cases.
