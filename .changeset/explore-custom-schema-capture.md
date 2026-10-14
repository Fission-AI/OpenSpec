---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **Explore no longer offers to write default-schema files under a custom schema** — The explore workflow's "where to capture" table and example offers now say they describe the default spec-driven schema. With another schema, the agent captures each insight in an artifact that schema defines, names it in the offer, and never creates a file such as `design.md` that the schema does not have.
