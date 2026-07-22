---
"@fission-ai/openspec": patch
---

Move the config key guards to the point of the write.

`setNestedValue` and `deleteNestedValue` checked the whole key path up front, through a helper. That is correct, but static analysis could not follow it, so CodeQL kept reporting prototype-pollution on the assignments it guards. The check now compares each segment literally in the loop that performs the write, which reads more directly and is visible to the analyzer. Behavior is unchanged for every key.
