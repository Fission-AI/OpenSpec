## MODIFIED Requirements

### Requirement: Next Artifact Discovery

The workflow SHALL use `openspec status` output to determine what can be created next, rather than a separate next-command surface.

#### Scenario: Discover next artifacts from status output

- **WHEN** a user needs to know which artifact to create next
- **THEN** `openspec status --change <id>` identifies ready artifacts with `[ ]`
- **AND** the first `[ ]` entry is the schema's recommended next artifact
- **AND** no dedicated "next command" is required to continue the workflow

#### Scenario: Status names the command that moves the change forward

- **WHEN** a user runs `openspec status --change <id>` in text mode and a next step resolves
- **THEN** the output ends with a `Next:` line naming exactly one command to run
- **AND** that command is `openspec instructions <artifact> --change "<id>" --json` for the first ready artifact while any planning artifact is still ready
- **AND** it is `openspec instructions apply --change "<id>" --json` once every planning artifact exists, printed after the completion line rather than in place of it, because that line alone reads as "you are done" while implementation tasks remain
- **AND** the named artifact is never one the change skipped, which satisfies its dependents but must not be created
- **AND** the artifact id comes from the resolved schema, so a project whose schema declares neither of the default artifact names still gets a usable command

#### Scenario: The named command carries the store selection

- **WHEN** the resolved root is a store
- **THEN** the `Next:` command includes `--store <id>`, so it resolves against the same root the status was read from rather than the pointer repo

#### Scenario: Both surfaces name the same command

- **WHEN** a next step resolves
- **THEN** the command printed on the `Next:` line and the command inside the JSON `nextSteps` sentence are derived from one resolution, so the two surfaces cannot name different commands
- **AND** the `Next:` line never appears in `--json` output, which stays parseable

#### Scenario: No next step resolves

- **WHEN** no artifact is ready and planning is not complete, or a change in an `--all` sweep failed to load
- **THEN** no `Next:` line is printed for it, rather than a guessed or shared command
