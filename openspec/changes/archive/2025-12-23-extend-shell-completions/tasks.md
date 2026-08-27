# Implementation Tasks

## Phase 1: Foundation and Bash Support

- [x] Update `SupportedShell` type in `src/utils/shell-detection.ts` to include `'bash' | 'fish' | 'powershell'`
- [x] Extend shell detection logic to recognize bash, fish, and PowerShell from environment variables
- [x] Create `src/core/completions/generators/bash-generator.ts` implementing `CompletionGenerator` interface
- [x] Create `src/core/completions/installers/bash-installer.ts` implementing `CompletionInstaller` interface
- [x] Update `CompletionFactory.createGenerator()` to support bash
- [x] Update `CompletionFactory.createInstaller()` to support bash
- [x] Create test file `test/core/completions/generators/bash-generator.test.ts` mirroring zsh test structure
- [x] Create test file `test/core/completions/installers/bash-installer.test.ts` mirroring zsh test structure
- [x] Verify bash completions work manually: `openspec completion install bash && exec bash`

## Phase 2: Fish Support

- [x] Create `src/core/completions/generators/fish-generator.ts` implementing `CompletionGenerator` interface
- [x] Create `src/core/completions/installers/fish-installer.ts` implementing `CompletionInstaller` interface
- [x] Update `CompletionFactory.createGenerator()` to support fish
- [x] Update `CompletionFactory.createInstaller()` to support fish
- [x] Create test file `test/core/completions/generators/fish-generator.test.ts`
- [x] Create test file `test/core/completions/installers/fish-installer.test.ts`
- [x] Verify fish completions work manually: `openspec completion install fish`

## Phase 3: PowerShell Support

- [x] Create `src/core/completions/generators/powershell-generator.ts` implementing `CompletionGenerator` interface
- [x] Create `src/core/completions/installers/powershell-installer.ts` implementing `CompletionInstaller` interface
- [x] Update `CompletionFactory.createGenerator()` to support powershell
- [x] Update `CompletionFactory.createInstaller()` to support powershell
- [x] Create test file `test/core/completions/generators/powershell-generator.test.ts`
- [x] Create test file `test/core/completions/installers/powershell-installer.test.ts`
- [x] Verify PowerShell completions work manually on Windows or macOS PowerShell

## Phase 4: Documentation and Testing

- [x] Update `CLAUDE.md` or relevant documentation to mention all four supported shells
- [x] Add cross-shell consistency test verifying all shells support same commands
- [x] Run `pnpm test` to ensure all tests pass
- [x] Run `pnpm run build` to verify TypeScript compilation
- [x] Test all shells on different platforms (Linux for bash/fish/zsh, Windows/macOS for PowerShell)

## Phase 5: Validation and Cleanup

- [x] Run `openspec validate extend-shell-completions --strict` and resolve all issues
- [x] Update error messages to list all four supported shells
- [x] Verify `openspec completion --help` documentation is current
- [x] Test auto-detection works for all shells
- [x] Ensure uninstall works cleanly for all shells