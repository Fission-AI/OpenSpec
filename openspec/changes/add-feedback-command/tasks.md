## 1. Feedback Command

- [x] 1.1 Create `src/commands/feedback.ts` with command implementation
- [x] 1.2 Check `gh` CLI availability with `which gh` or equivalent
- [x] 1.3 Check GitHub auth status with `gh auth status`
- [x] 1.4 Execute `gh issue create` with formatted title and body
- [x] 1.5 Display issue URL returned by `gh` CLI
- [x] 1.6 Register `feedback <message>` command in `src/cli/index.ts`

## 2. Shell Completions

- [x] 2.1 Add `feedback` command to command registry
- [x] 2.2 Regenerate completion scripts for all shells

## 3. Feedback Skill

- [x] 3.1 Create feedback skill template in `skill-templates.ts`
- [x] 3.2 Document context gathering workflow
- [x] 3.3 Document anonymization rules
- [x] 3.4 Document user confirmation flow

## 4. Testing

- [x] 4.1 Add unit tests for feedback command (mock `gh` subprocess calls)
- [x] 4.2 Add integration test for full feedback flow with mocked `gh` CLI
- [x] 4.3 Test error handling for missing `gh` CLI
- [x] 4.4 Test error handling for unauthenticated `gh` session
