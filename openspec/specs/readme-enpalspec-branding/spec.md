# readme-enpalspec-branding Specification

## Purpose
Define the EnpalSpec branding requirements for the README, welcome screen, and init success messages.

## Requirements

### Requirement: README references enpalspec workflow commands
The README SHALL reference `/enpalspec:propose`, `/enpalspec:apply`, and `/enpalspec:archive` as the default workflow commands, not the upstream `/opsx:*` equivalents.

#### Scenario: See it in action example uses enpalspec commands
- **WHEN** a user reads the "See it in action" code block
- **THEN** the commands shown are `/enpalspec:propose`, `/enpalspec:apply`, and `/enpalspec:archive`

#### Scenario: Quick Start prompt uses enpalspec:propose
- **WHEN** a user reads the Quick Start section
- **THEN** the AI prompt instruction reads `/enpalspec:propose <what-you-want-to-build>`

#### Scenario: Tip callout references enpalspec workflow
- **WHEN** a user reads the tip callout at the top of the README
- **THEN** it references `/enpalspec:propose` and the enpalspec workflow, not `/opsx:propose`

### Requirement: README acknowledges OpenSpec as the upstream base
The README SHALL include a brief acknowledgement that enpalspec is built on top of OpenSpec, with a link to the OpenSpec repository.

#### Scenario: Shoutout visible to readers
- **WHEN** a user reads the README
- **THEN** they can find a line crediting OpenSpec as the foundation (e.g., "Built on [OpenSpec](https://github.com/Fission-AI/OpenSpec)")

### Requirement: Welcome screen shows enpalspec branding and commands
The `enpalspec init` welcome screen SHALL display "Welcome to enpalspec" and show `/enpalspec:*` commands in the quick-start list, not `/opsx:*`.

#### Scenario: Welcome title is enpalspec
- **WHEN** a user runs `enpalspec init` and the welcome screen is displayed
- **THEN** the title reads "Welcome to enpalspec"

#### Scenario: Quick-start commands on welcome screen use enpalspec namespace
- **WHEN** a user sees the quick-start command list on the welcome screen
- **THEN** the commands shown are `/enpalspec:propose`, `/enpalspec:apply`, and `/enpalspec:archive`

### Requirement: Init success message uses enpalspec branding
The post-init success output in `src/core/init.ts` SHALL use "enpalspec" labels rather than "OpenSpec".

#### Scenario: Setup complete heading uses enpalspec
- **WHEN** `enpalspec init` completes successfully
- **THEN** the output heading reads "enpalspec Setup Complete"

#### Scenario: Configured tools label uses enpalspec
- **WHEN** previously configured tools are shown during init
- **THEN** the label reads "enpalspec configured:" not "OpenSpec configured:"
