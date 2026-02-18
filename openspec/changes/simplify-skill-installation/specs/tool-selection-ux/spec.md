## Purpose

Tool selection UX SHALL use industry-standard keybindings (space to toggle, enter to confirm) to reduce user confusion during initialization.

## MODIFIED Requirements

### Requirement: Multi-select keybindings
The tool selection prompt SHALL use standard keybindings for multi-select.

#### Scenario: Toggle selection with space
- **WHEN** user presses Space key on a tool option
- **THEN** the system SHALL toggle the selection state of that option

#### Scenario: Confirm selection with enter
- **WHEN** user presses Enter key
- **THEN** the system SHALL confirm the current selection and proceed

#### Scenario: Navigate with arrow keys
- **WHEN** user presses Up or Down arrow keys
- **THEN** the system SHALL move the cursor to the previous or next option

### Requirement: Remove tab-to-confirm behavior
The tool selection prompt SHALL NOT use Tab to confirm selection.

#### Scenario: Tab key behavior
- **WHEN** user presses Tab key
- **THEN** the system SHALL NOT confirm selection
- **THEN** the system MAY move focus or do nothing (implementation-dependent)

### Requirement: Selection feedback
The tool selection prompt SHALL clearly indicate selected and unselected states.

#### Scenario: Visual feedback
- **WHEN** displaying tool options
- **THEN** selected options SHALL show a filled checkbox (e.g., `[x]`)
- **THEN** unselected options SHALL show an empty checkbox (e.g., `[ ]`)

#### Scenario: Help text
- **WHEN** displaying the selection prompt
- **THEN** the system SHALL show hint text: "Space to toggle, Enter to confirm"
