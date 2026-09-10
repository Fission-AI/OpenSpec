## ADDED Requirements

### Requirement: Packaged Manual Page

The published package SHALL ship a section 1 manual page, generated from the CLI, and declare it so a global npm install links it into the reader's man path.

#### Scenario: Building the package

- **WHEN** the build runs
- **THEN** render the manual from the commander program the CLI itself parses with
- **AND** write it to `dist/man/openspec.1`
- **AND** derive the page date from `SOURCE_DATE_EPOCH` when it is set, so identical sources produce an identical page

#### Scenario: A package with no CLI reuses the build

- **WHEN** the build script runs against a package that compiles no CLI entry point
- **THEN** skip the manual and report the skip, rather than failing the build

#### Scenario: Reading the manual

- **WHEN** the reader opens the page
- **THEN** describe the program, its global options, and every command the CLI advertises, including subcommands, at their full invocation
- **AND** list each command's arguments that carry a description, each of its options, and any alias it answers to
- **AND** omit commands and options the CLI hides from `--help`
- **AND** document `--help` once rather than repeating it for every command
- **AND** carry the sections a reader expects of a manual that the command tree cannot supply: exit status, environment variables, files, and examples

#### Scenario: Sections the command tree cannot supply

- **WHEN** the page documents exit codes or environment variables
- **THEN** document exactly the ones the CLI reference documents, so the two cannot drift apart

#### Scenario: An example that no longer runs

- **WHEN** an example names a command or passes a flag the CLI does not have
- **THEN** fail, rather than shipping an example a reader cannot run

#### Scenario: Text that roff would read as markup

- **WHEN** a description contains a backslash, a hyphen, a line break, or begins a line with `.` or `'`
- **THEN** escape it so the page renders the author's text rather than formatter instructions
- **AND** wrap the generated source lines, protecting every line the wrap creates, not only the first

#### Scenario: A value the page header quotes

- **WHEN** a version or date carries a quote or a backslash
- **THEN** neutralize it so the header's quoted arguments still parse
- **AND** leave the date otherwise as written, which is the form a manual reader's tools expect

#### Scenario: Publishing

- **WHEN** the release guard checks the packed tarball
- **THEN** fail the release when the tarball carries no `dist/man/openspec.1`
