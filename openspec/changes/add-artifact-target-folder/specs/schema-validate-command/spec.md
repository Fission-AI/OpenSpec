## ADDED Requirements

### Requirement: External Folder Field Validation

The schema validation logic SHALL reject schemas whose artifact `folder` values violate the path-safety rules. Validation SHALL run inside the Zod refinement layer used by `parseSchema`, so every consumer of the schema (`openspec schema validate`, the artifact graph loader, the instructions command) sees the same errors without each having to duplicate the rule.

The rules SHALL be expressed using only Node's stdlib `path` module — no bespoke cross-platform parsing. The codebase's existing `FileSystemUtils` helpers cover any downstream cross-platform path math.

1. The value MUST NOT be empty (after `trim()`).
2. The value MUST NOT be an absolute path. A single `!path.isAbsolute(folder)` check natively covers POSIX `/...` and Windows `C:\...` forms — no separate Windows clause is required.
3. The value, after `path.resolve(stubProjectRoot, folder)`, MUST remain a descendant of `stubProjectRoot`. This single check captures `..` escapes in any form (leading, nested, or post-normalization).
4. The value MUST NOT start with `openspec/` and MUST NOT equal `openspec` (after `path.normalize`) — this prefix is reserved for the change/archive/specs lifecycle.

Each violation SHALL produce a single Zod issue identifying the offending artifact ID, the field path, and a human-readable message describing the rule that failed.

#### Scenario: Absolute path rejected
- **WHEN** an artifact declares `folder: "/etc/openspec"`
- **THEN** schema validation reports an error indicating absolute paths are not allowed
- **AND** `openspec schema validate` exits with non-zero code

#### Scenario: Windows absolute path rejected
- **WHEN** an artifact declares `folder: "C:\\\\Windows\\\\Temp"`
- **THEN** schema validation reports an error indicating absolute paths are not allowed
- **AND** `openspec schema validate` exits with non-zero code

#### Scenario: Parent traversal rejected
- **WHEN** an artifact declares `folder: "../outside-repo"`
- **THEN** schema validation reports an error indicating the path escapes the project root
- **AND** `openspec schema validate` exits with non-zero code

#### Scenario: Parent traversal via nested segments rejected
- **WHEN** an artifact declares `folder: "ADR/../../../escape"`
- **THEN** schema validation reports an error indicating the path escapes the project root after normalization
- **AND** `openspec schema validate` exits with non-zero code

#### Scenario: Reserved openspec prefix rejected
- **WHEN** an artifact declares `folder: "openspec/specs"` or `folder: "openspec"`
- **THEN** schema validation reports an error stating that the `openspec/` prefix is reserved
- **AND** `openspec schema validate` exits with non-zero code

#### Scenario: Empty folder rejected
- **WHEN** an artifact declares `folder: ""` or `folder: "   "`
- **THEN** schema validation reports an error indicating folder must be a non-empty path
- **AND** `openspec schema validate` exits with non-zero code

#### Scenario: Valid relative folder accepted
- **WHEN** an artifact declares `folder: "ADR"` or `folder: "docs/decisions"`
- **THEN** schema validation passes with no errors related to the folder field

#### Scenario: Folder field omitted entirely accepted
- **WHEN** an artifact does not declare a `folder` field
- **THEN** schema validation passes with no errors related to the folder field
- **AND** behavior is identical to schemas predating this feature
