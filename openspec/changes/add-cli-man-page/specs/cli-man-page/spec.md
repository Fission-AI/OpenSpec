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
- **AND** list each command's arguments that carry a description and each of its options
- **AND** omit commands and options the CLI hides from `--help`
- **AND** document `--help` once rather than repeating it for every command

#### Scenario: Text that roff would read as markup

- **WHEN** a description contains a backslash, a hyphen, a line break, or begins a line with `.` or `'`
- **THEN** escape it so the page renders the author's text rather than formatter instructions

#### Scenario: Publishing

- **WHEN** the release guard checks the packed tarball
- **THEN** fail the release when the tarball carries no `dist/man/openspec.1`
