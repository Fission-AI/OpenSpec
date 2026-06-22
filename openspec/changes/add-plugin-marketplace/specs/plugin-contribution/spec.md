## Purpose

Define how a plugin contributes skills, commands, and workflows that OpenSpec installs into AI tool directories, and how those artifacts are tracked so they can be removed safely.

## ADDED Requirements

### Requirement: Plugin-contributed skills and commands install across tools
OpenSpec SHALL install an active plugin's contributed skills and commands into the selected AI tool directories using the same delivery pipeline as core skills and commands.

#### Scenario: Contributed skill installed into selected tools
- **WHEN** an active plugin declares a contributed skill
- **AND** the project has one or more configured AI tools
- **THEN** OpenSpec SHALL install that skill into each configured tool's directory

#### Scenario: Delivery mode respected
- **WHEN** the global delivery mode is `skills`, `commands`, or `both`
- **THEN** plugin-contributed artifacts SHALL honor the same delivery mode as core artifacts

### Requirement: Contributed artifacts tracked by explicit name
Plugin-contributed artifacts SHALL be tracked by explicit, plugin-namespaced names rather than by pattern matching.

#### Scenario: Tracking installed artifacts
- **WHEN** OpenSpec installs a plugin's contributed artifacts
- **THEN** it SHALL record each artifact under a plugin-owned name
- **AND** SHALL be able to identify those artifacts later for cleanup

### Requirement: Safe cleanup on disable or removal
Disabling or removing a plugin SHALL remove only that plugin's managed artifacts and leave all other files untouched.

#### Scenario: Cleanup on plugin removal
- **WHEN** a plugin is disabled or removed
- **THEN** OpenSpec SHALL remove only the artifacts it installed for that plugin
- **AND** SHALL NOT remove core artifacts or user-authored files

### Requirement: Contributed paths are constrained to prevent traversal
Plugin-contributed skill paths SHALL be confined to safe locations: an install directory name SHALL be a single path segment, and a source path SHALL stay inside the plugin package. OpenSpec SHALL reject traversal at manifest validation and SHALL re-check containment before every copy or delete.

#### Scenario: Manifest declares a traversing skill path
- **WHEN** a manifest declares a skill `dir` containing a path separator or `..`, or a `source` that is absolute or contains `..`
- **THEN** OpenSpec SHALL treat the manifest as invalid

#### Scenario: Containment enforced at filesystem operations
- **WHEN** OpenSpec installs or removes a contributed skill
- **THEN** it SHALL resolve the target and verify it is inside the tool skills directory (for installs/removals) and inside the plugin package (for sources)
- **AND** SHALL skip any operation whose resolved target escapes those boundaries

### Requirement: Resilient handling of malformed contributions
A malformed contributed template SHALL NOT abort initialization or update.

#### Scenario: Malformed contributed template
- **WHEN** a plugin's contributed template is malformed or unreadable
- **THEN** OpenSpec SHALL skip that artifact with a warning
- **AND** SHALL continue installing remaining core and plugin artifacts

### Requirement: Contributed workflows are namespaced
Plugin-contributed workflows SHALL be distinguishable from core workflows.

#### Scenario: Listing workflows with a plugin present
- **WHEN** a plugin contributes a workflow
- **THEN** OpenSpec SHALL present it as plugin-provided and attributable to its plugin
- **AND** SHALL NOT silently override a core workflow of the same name
