## 1. GitHub Authentication

- [ ] 1.1 Create `src/auth/github.ts` module with Device OAuth flow
- [ ] 1.2 Implement token storage in global config (`~/.config/openspec/`)
- [ ] 1.3 Add `getGitHubAuth()` function that returns cached token or initiates auth
- [ ] 1.4 Add `clearGitHubAuth()` function for logout capability

## 2. Feedback Command

- [ ] 2.1 Create `src/commands/feedback.ts` with command implementation
- [ ] 2.2 Register `feedback <message>` command in CLI
- [ ] 2.3 Implement `--body` flag for rich content (title + body)
- [ ] 2.4 Create GitHub Issue via API with `feedback` label
- [ ] 2.5 Display created issue URL on success

## 3. Shell Completions

- [ ] 3.1 Add `feedback` command to command registry
- [ ] 3.2 Regenerate completion scripts for all shells

## 4. Feedback Skill

- [ ] 4.1 Create feedback skill template in `skill-templates.ts`
- [ ] 4.2 Document context gathering workflow
- [ ] 4.3 Document anonymization rules
- [ ] 4.4 Document user confirmation flow

## 5. Testing

- [ ] 5.1 Add unit tests for GitHub auth module
- [ ] 5.2 Add unit tests for feedback command
- [ ] 5.3 Add integration test for full feedback flow (mocked GitHub API)
