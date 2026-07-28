---
"@fission-ai/openspec": patch
---

Gemini command files escape TOML-active characters (quotes, backslashes, control characters) in the description and prompt, so a template value containing them can no longer produce an invalid `.toml` file.
