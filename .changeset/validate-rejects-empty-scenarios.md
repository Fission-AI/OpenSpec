---
'@fission-ai/openspec': patch
---

Stop `validate` accepting a requirement whose only scenario is a bare header. The delta scenario counter counted every `####` header, while the spec path that archive uses to validate the rebuilt spec keeps a scenario only when its body has content, so `validate` called such a change valid and `archive` then refused it with a generic "Requirement must have at least one scenario" that did not name the requirement. Both paths now share one rule, `hasScenarioBody`, and read a scenario's body up to the same boundary, so `validate` rejects exactly what archive rejects, naming the requirement and saying that a header with no body under it does not count. A scenario whose body is only a fenced block or a deeper header still counts, a requirement with one real scenario is still accepted even when another is empty, and main-spec validation is unchanged.
