## MODIFIED Requirements

### Requirement: Capability Retirement

A delta whose REMOVED entries cover every requirement a capability has SHALL retire that capability instead of writing a main spec with no requirements, which can never pass validation.

#### Scenario: Deciding that a rebuilt spec cannot be written

- **WHEN** applying a delta leaves the rebuilt spec with no requirement blocks, and every other nonblank line in the whole file is accounted for as the title, Purpose, Requirements header, or a canonical requirement's statement, scenarios, or fenced examples
- **THEN** put that rebuilt spec to the spec validator
- **AND** treat it as retirable only when its sole validation error is that the spec has no requirements
- **AND** otherwise write or reject it exactly as any other rebuilt spec, so a spec the validator still accepts, one broken in some further way, and one still holding a `###` heading are all left alone

#### Scenario: Validation was skipped

- **WHEN** the archive runs with validation disabled
- **THEN** retire nothing, because no verdict was produced to justify a deletion
- **AND** write the rebuilt spec exactly as an archive without this behavior would

#### Scenario: Retirement is not declared

- **WHEN** a rebuilt spec is retirable but the change does not declare `retire_capabilities: true` in its metadata, or declares it in metadata that cannot be honored
- **THEN** write the spec as any other, so the archive aborts on it exactly as it did before this behavior existed
- **AND** name the marker as the fix in that abort, and say when a marker that is present cannot be honored
- **AND** say nothing about the marker when retiring would not have made the spec writable anyway

#### Scenario: Delta removes the capability's last requirement

- **WHEN** a retirable rebuilt spec belongs to a capability whose main spec exists
- **AND** at least one requirement was actually removed by this run
- **AND** the change declares `retire_capabilities: true`
- **THEN** delete the capability's `spec.md` instead of writing it
- **AND** refuse to delete when the target resolves outside the real specs root
- **AND** delete any in-root directory the deletion leaves empty, and never the specs root itself
- **AND** count every operation the delta applied in the archive totals
- **AND** record the retirement in the archive warnings, naming what the deleted file held and giving a pasteable Git recovery command only when the spec lived in the caller's checkout

#### Scenario: Retirement is deferred until every spec is written

- **WHEN** an archive both retires one capability and updates another
- **THEN** settle the archive destination before touching any spec, so a name collision cannot strand a retirement
- **AND** perform the deletion only after every spec write has succeeded
- **AND** report a destination claimed while the merge ran as the same collision, rather than as a raw filesystem error

#### Scenario: Capability directory holds other files

- **WHEN** retiring a capability whose directory still holds other files after `spec.md` is deleted
- **THEN** leave that directory in place

#### Scenario: Removal was already synced

- **WHEN** a retirable rebuilt spec removed nothing this run and its main spec exists
- **THEN** leave the file untouched
- **AND** abort the archive with the validation error, as for any other unwritable spec, unless validation was skipped

#### Scenario: Content the merge cannot account for

- **WHEN** the spec holds any non-blank line the merge cannot name - anywhere in the file, including above the requirements section and inside a requirement block, where content the parser did not read as a new header rides along
- **THEN** refuse the retirement, because deleting the file would take that content with it
- **AND** say which lines stood in the way when the change declared the marker, rather than aborting on the bare validation error

#### Scenario: A bullet that wraps onto further lines

- **WHEN** a line inside a requirement block continues the list item above it - no blank line, heading, fence or new bullet has closed that item, and the line does not open a block of its own
- **THEN** account for it as part of that item rather than as a line in its own right, so a scenario bullet wrapped to a column limit does not refuse the retirement
- **AND** still weigh a table row, block quote, raw HTML, thematic break, fence or heading written directly beneath a bullet on its own, because each opens a block a reader sees as separate content

#### Scenario: Main spec is already gone

- **WHEN** a REMOVED-only delta targets a capability that has no main spec, and the change declares `retire_capabilities: true`
- **THEN** complete the archive without creating or retiring one
