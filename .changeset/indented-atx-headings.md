---
"@fission-ai/openspec": patch
---

Stop deleting content that sits next to a removed requirement. A requirement block runs until the next heading OpenSpec recognises, so a heading it doesn't — one indented by the one-to-three spaces Markdown allows, or a plain `### Notes` — was absorbed into the requirement above it and deleted along with it when a change removed that requirement. Silently: nothing counted the content, so nothing warned, and the spec left behind still validated. That content is now kept in place. Nothing is reclassified — an indented heading still isn't a requirement, exactly as before — and a requirement's own `#### Scenario:` blocks still travel with it.
