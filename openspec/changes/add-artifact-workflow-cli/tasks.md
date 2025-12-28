## 1. Core Command Implementation

- [ ] 1.1 Create `src/commands/artifact-workflow.ts` with all commands
- [ ] 1.2 Implement `status` command with text output
- [ ] 1.3 Implement `next` command with text output
- [ ] 1.4 Implement `instructions` command with text output
- [ ] 1.5 Implement `templates` command with text output
- [ ] 1.6 Implement `new change` subcommand using createChange()

## 2. CLI Registration

- [ ] 2.1 Register `status` command in `src/cli/index.ts`
- [ ] 2.2 Register `next` command in `src/cli/index.ts`
- [ ] 2.3 Register `instructions` command in `src/cli/index.ts`
- [ ] 2.4 Register `templates` command in `src/cli/index.ts`
- [ ] 2.5 Register `new` command group with `change` subcommand

## 3. Output Formatting

- [ ] 3.1 Add `--json` flag support to all commands
- [ ] 3.2 Add color-coded status indicators (done/ready/blocked)
- [ ] 3.3 Add progress spinner for loading operations
- [ ] 3.4 Support `--no-color` flag

## 4. Error Handling

- [ ] 4.1 Handle missing `--change` parameter with helpful error
- [ ] 4.2 Handle unknown change names with list of available changes
- [ ] 4.3 Handle unknown artifact names with valid options
- [ ] 4.4 Handle schema resolution errors

## 5. Options and Flags

- [ ] 5.1 Add `--schema` option for custom schema selection
- [ ] 5.2 Add `--description` option to `new change` command
- [ ] 5.3 Ensure options follow existing CLI patterns

## 6. Testing

- [ ] 6.1 Add smoke tests for each command
- [ ] 6.2 Test error cases (missing change, unknown artifact)
- [ ] 6.3 Test JSON output format
- [ ] 6.4 Test with different schemas

## 7. Documentation

- [ ] 7.1 Add help text for all commands marked as "Experimental"
- [ ] 7.2 Update AGENTS.md with new commands (post-archive)
