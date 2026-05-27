## ADDED Requirements

### Requirement: Dynamic Version Support
The script SHALL support flake.nix configurations that read version dynamically from package.json.

#### Scenario: Version validation
- **WHEN** script runs
- **THEN** version is read from package.json using Node.js
- **AND** script verifies flake.nix uses dynamic version pattern
- **AND** warns if hardcoded version is detected

#### Scenario: Version display
- **WHEN** script runs
- **THEN** script displays current package version
- **AND** indicates version is read dynamically by flake.nix

### Requirement: Automatic Hash Determination
The script SHALL automatically determine and update the correct pnpm dependency hash.

#### Scenario: Trigger build to get hash
- **WHEN** script needs to determine correct hash
- **THEN** script sets placeholder hash in flake.nix
- **AND** runs nix build which fails with correct hash
- **AND** extracts correct hash from build error output

#### Scenario: Hash extraction from build output
- **WHEN** nix build fails with hash mismatch
- **THEN** script parses "got: sha256-..." from error output
- **AND** updates flake.nix with correct hash

#### Scenario: Hash update failure
- **WHEN** script cannot extract hash from build output
- **THEN** script restores original hash to flake.nix
- **AND** exits with error code 1
- **AND** displays build output for debugging

### Requirement: Build Verification
The script SHALL verify that flake.nix builds successfully after updates.

#### Scenario: Successful verification
- **WHEN** hash has been updated
- **THEN** script runs nix build to verify
- **AND** reports success if build completes

#### Scenario: Dirty git tree warning
- **WHEN** build succeeds but git tree is dirty
- **THEN** script reports warning about dirty tree
- **AND** still indicates build success

### Requirement: User Feedback
The script SHALL provide clear progress information and next steps.

#### Scenario: Progress reporting
- **WHEN** script runs
- **THEN** each step is reported with descriptive message
- **AND** detected version and hash are displayed

#### Scenario: Success summary
- **WHEN** script completes successfully
- **THEN** summary shows version and hash changes
- **AND** next steps are displayed (test, verify, commit)

#### Scenario: No changes needed
- **WHEN** hash is already up-to-date
- **THEN** script reports no changes needed
- **AND** exits with success code 0

### Requirement: Script Safety
The script SHALL fail fast on errors and use safe defaults.

#### Scenario: Bash error handling
- **WHEN** script encounters an error
- **THEN** script exits immediately (set -e)
- **AND** undefined variables cause exit (set -u)
- **AND** pipe failures are caught (set -o pipefail)

#### Scenario: File path resolution
- **WHEN** script determines file locations
- **THEN** paths are calculated relative to script location
- **AND** script works regardless of working directory

### Requirement: Documentation
The system SHALL provide documentation for the update script.

#### Scenario: Script usage documentation
- **WHEN** maintainer needs to use update script
- **THEN** scripts/README.md explains when and how to use it
- **AND** example workflow is provided

#### Scenario: Script listing
- **WHEN** maintainer views scripts/README.md
- **THEN** all maintenance scripts are documented
- **AND** purpose of each script is clear
