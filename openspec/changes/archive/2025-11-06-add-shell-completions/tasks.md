# Implementation Tasks

## Phase 1: Foundation & Architecture

- [x] Create `src/utils/shell-detection.ts` with `SupportedShell` type and `detectShell()` function
- [x] Create `src/core/completions/types.ts` with interfaces: `CompletionGenerator`, `CommandDefinition`, `FlagDefinition`
- [x] Create `src/core/completions/command-registry.ts` with `COMMAND_REGISTRY` constant defining all OpenSpec commands, flags, and metadata
- [x] Create `src/core/completions/completion-provider.ts` with `CompletionProvider` class for dynamic change/spec ID discovery with 2-second caching
- [x] Write tests for shell detection (`test/utils/shell-detection.test.ts`)
- [x] Write tests for completion provider (`test/core/completions/completion-provider.test.ts`)

## Phase 2: Zsh Completion (Oh My Zsh Priority)

- [x] Create `src/core/completions/generators/zsh-generator.ts` implementing `CompletionGenerator` interface
- [x] Implement Zsh script generation using `_arguments` and `_describe` patterns
- [x] Add dynamic completion logic for change/spec IDs using completion provider
- [x] Test Zsh generator output (`test/core/completions/generators/zsh-generator.test.ts`)
- [x] Create `src/core/completions/installers/zsh-installer.ts` with Oh My Zsh and standard Zsh support
- [x] Implement Oh My Zsh detection (`$ZSH` env var or `~/.oh-my-zsh/` directory)
- [x] Implement installation to `~/.oh-my-zsh/custom/completions/_openspec` for Oh My Zsh
- [x] Implement fallback installation to `~/.zsh/completions/_openspec` with `fpath` updates
- [x] Test Zsh installer logic with mocked file system (`test/core/completions/installers/zsh-installer.test.ts`)

## Phase 3: CLI Command Implementation

- [x] Create `src/commands/completion.ts` with `CompletionCommand` class
- [x] Register `completion` command in `src/cli/index.ts` with subcommands: generate, install, uninstall
- [x] Implement `generateSubcommand()` that outputs Zsh script to stdout
- [x] Implement `installSubcommand(shell?: 'zsh')` with auto-detection for Zsh-only
- [x] Implement `uninstallSubcommand(shell?: 'zsh')` for removing Zsh completions
- [x] Add `--verbose` flag support for detailed installation output
- [x] Add error handling with clear messages: "Shell '<name>' is not supported yet. Currently supported: zsh"
- [x] Test completion command integration (`test/commands/completion.test.ts`)

## Phase 4: Integration & Polish

- [x] Create factory pattern in `src/core/completions/factory.ts` to instantiate Zsh generator/installer (extensible for future shells)
- [x] Add `completion` command to command registry for self-referential completion
- [x] Implement dynamic completion helper functions in Zsh generator (`_openspec_complete_changes`, `_openspec_complete_specs`, `_openspec_complete_items`)
- [x] Add 'shell' positional type for completion command arguments
- [x] Test completion generation with dynamic helpers
- [x] Test completion install/uninstall flow
- [x] Verify all tests pass (97 completion tests, 340 total tests)
- [x] Implement auto-install via npm postinstall script
- [x] Add safety checks (CI detection, opt-out flag)
- [x] Handle Oh My Zsh vs standard Zsh installation paths
- [x] Add test script for postinstall validation
- [x] Document auto-install behavior and opt-out in README
- [ ] Manually test Zsh completion in Oh My Zsh environment (install, test tab completion, uninstall)
- [ ] Manually test Zsh completion in standard Zsh environment
- [ ] Test dynamic change/spec ID completion in real OpenSpec projects
- [ ] Verify completion cache behavior (2-second TTL)
- [ ] Test behavior outside OpenSpec projects (should skip dynamic completions)
- [x] Update `openspec --help` output to include completion command (automatically done via Commander)

## Phase 5: Edge Cases & Error Handling

- [ ] Test and handle permission errors during installation
- [ ] Test and handle missing shell configuration directories (auto-create with notification)
- [ ] Test "already installed" detection and reinstall flow
- [ ] Test "not installed" detection during uninstall
- [ ] Verify `--no-color` flag is respected in completion command output
- [ ] Test shell detection failure scenarios with helpful error messages
- [ ] Ensure graceful handling when `$SHELL` is unset or invalid
- [ ] Test non-Zsh shells get clear "not supported yet" error messages
- [ ] Test generator output can be redirected to files without corruption

## Dependencies

- Phase 2 depends on Phase 1 (foundation must exist first)
- Phase 3 depends on Phase 2 (CLI needs Zsh generator working)
- Phase 4 depends on Phase 3 (integration requires CLI + Zsh implementation)
- Phase 5 depends on Phase 4 (edge case testing after core functionality works)

## Future Work (Not in This Proposal)

- **Bash completions** - Create bash-generator.ts and bash-installer.ts in follow-up proposal
- **Fish completions** - Create fish-generator.ts and fish-installer.ts in follow-up proposal
- **PowerShell completions** - Create powershell-generator.ts and powershell-installer.ts in follow-up proposal

The architecture is designed to make adding these shells straightforward by implementing the `CompletionGenerator` interface.
