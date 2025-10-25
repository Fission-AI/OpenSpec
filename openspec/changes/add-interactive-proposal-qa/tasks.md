## 1. Discovery & Design
- [ ] 1.1 Audit existing slash command files (`src/core/templates/slash-command-templates.ts`, configurators, tests) to mirror tone/format.
- [ ] 1.2 Draft conversational flow map covering request analysis, question generation heuristics, question formatting, and post-qa summary/next-steps.
- [ ] 1.3 Validate the flow against the example repo in issue #85 to ensure parity with proven UX patterns (e.g., defaults, recommended answers).

## 2. Specification Updates
- [ ] 2.1 Add `assistant-proposal-qa` capability spec capturing requirements for analysis, questioning, summary, and hand-off UX.
- [ ] 2.2 Update `cli-init` and `cli-update` specs so generated slash command files include the new `proposal-qa` command for all supported assistants.

## 3. Implementation
- [ ] 3.1 Extend `SlashCommandId` union, templates, and file writers to emit `/openspec/proposal-qa` with the new instructions body.
- [ ] 3.2 Implement helper(s) that build recommended answer options from agent analysis (list of option label, description, default marker).
- [ ] 3.3 Ensure question loop enforces 3–6 prompts, each with rationale and recommended default, and gracefully handles user-supplied alternatives.
- [ ] 3.4 Update onboarding/update flows to write `.claude/.cursor/.opencode` command markdown for `proposal-qa` alongside existing commands.

## 4. Validation & QA
- [ ] 4.1 Add unit tests covering slash template rendering for the new command and regression tests for init/update scaffolding.
- [ ] 4.2 Update documentation and examples (README, CHANGELOG as needed) showcasing how to use `/openspec/proposal-qa` and the resulting summary output.
- [ ] 4.3 Run `openspec validate add-interactive-proposal-qa --strict` and full test suite (`pnpm test`) to confirm specs and tooling stay green.
