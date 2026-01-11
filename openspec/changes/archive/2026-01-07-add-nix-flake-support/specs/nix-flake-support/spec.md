## ADDED Requirements

### Requirement: Multi-platform Nix flake
The system SHALL provide a Nix flake that builds OpenSpec for multiple platforms.

#### Scenario: Build on Linux x86_64
- **WHEN** user runs `nix build` on x86_64-linux system
- **THEN** system builds OpenSpec package successfully
- **AND** package includes the `openspec` binary

#### Scenario: Build on macOS ARM
- **WHEN** user runs `nix build` on aarch64-darwin system
- **THEN** system builds OpenSpec package successfully
- **AND** package includes the `openspec` binary

#### Scenario: Build on Linux ARM
- **WHEN** user runs `nix build` on aarch64-linux system
- **THEN** system builds OpenSpec package successfully

#### Scenario: Build on macOS x86_64
- **WHEN** user runs `nix build` on x86_64-darwin system
- **THEN** system builds OpenSpec package successfully

### Requirement: Direct execution via nix run
The system SHALL allow users to run OpenSpec directly from GitHub without installing.

#### Scenario: Run init command from GitHub
- **WHEN** user runs `nix run github:Fission-AI/OpenSpec -- init`
- **THEN** system downloads and builds OpenSpec
- **AND** executes `openspec init` command

#### Scenario: Run any OpenSpec command
- **WHEN** user runs `nix run github:Fission-AI/OpenSpec -- <command> <args>`
- **THEN** system executes `openspec <command> <args>`

### Requirement: pnpm dependency management
The system SHALL use pnpm for building OpenSpec in the Nix flake.

#### Scenario: Fetch dependencies with pnpm
- **WHEN** Nix builds the package
- **THEN** system uses `fetchPnpmDeps` to download dependencies
- **AND** uses pnpm-lock.yaml for reproducible builds
- **AND** uses fetcherVersion 3 for lockfile version 9.0

#### Scenario: Build with pnpm
- **WHEN** Nix runs the build phase
- **THEN** system executes `pnpm run build`
- **AND** produces dist directory with compiled TypeScript

### Requirement: Node.js version compatibility
The system SHALL use Node.js 20 as specified in package.json engines field.

#### Scenario: Build with correct Node version
- **WHEN** Nix builds OpenSpec
- **THEN** system uses nodejs_20 from nixpkgs
- **AND** build succeeds without version compatibility errors

### Requirement: Development shell
The system SHALL provide a Nix development shell for contributors.

#### Scenario: Enter dev shell
- **WHEN** user runs `nix develop` in OpenSpec repository
- **THEN** system provides shell with nodejs_20 and pnpm_9
- **AND** displays welcome message with versions
- **AND** provides instructions to run `pnpm install`

### Requirement: Proper binary installation
The system SHALL install the openspec binary correctly.

#### Scenario: Binary in PATH
- **WHEN** package is built or installed
- **THEN** `openspec` binary is available in `$out/bin/openspec`
- **AND** binary is executable
- **AND** binary can be invoked without full path when installed

#### Scenario: Binary executes correctly
- **WHEN** user runs the installed `openspec` command
- **THEN** system executes the CLI entry point
- **AND** all subcommands work correctly
