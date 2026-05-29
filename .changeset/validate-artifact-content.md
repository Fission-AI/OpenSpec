---
"@fission-ai/openspec": patch
---

### Bug Fixes

- Fixed workflow resumes so empty, whitespace-only, or HTML-comment-only artifact files are regenerated instead of being treated as completed. Heading-only or other partially-written artifacts are not yet detected and may still be treated as complete.
