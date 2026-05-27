## 1. Planning & Spec Updates
- [x] 1.1 Confirm overlap with `add-multi-agent-init` and coordinate extend-mode flow
- [x] 1.2 Update `pastelsdd/specs/cli-init/spec.md` to capture multi-select onboarding requirements

## 2. Implementation
- [x] 2.1 Add multi-select support to the `pastelsdd init` prompt, including indicators for existing tool configs
- [x] 2.2 Enhance success messaging to summarize created/refreshed assets per tool
- [x] 2.3 Ensure shared instruction template is applied consistently (CLAUDE.md, AGENTS.md, slash commands)

## 3. Quality
- [x] 3.1 Expand unit tests for init/update flows covering multi-select and summaries
- [x] 3.2 Perform `pastelsdd init` smoke test in a temp directory (document output)
