# Add Gemini CLI Extension Support

## Why
Integrating with Gemini CLI makes agents “OpenSpec-aware” by default, reducing setup friction and improving correctness via project-specific context.

## What Changes
- Add `gemini-extension.json` extension manifest (non-breaking).
- Add `GEMINI.md` Gemini-focused usage/context doc (non-breaking).
- Extract shared prompts into `src/core/templates/prompts.ts` (non-breaking).
- Add native Gemini slash commands under `.gemini/commands/openspec/` (non-breaking).

## Impact
- **Specs**: N/A (no spec schema changes).
- **Code**: New extension metadata + prompt source-of-truth; Gemini CLI users get a first-class onboarding path.

