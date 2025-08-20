## Why

OpenSpec currently provides only traditional CLI commands that require users to execute multiple commands sequentially to understand their project's state. Users need:
- A unified view of all specs and changes without running multiple list commands
- Real-time monitoring of validation status across the project
- Interactive exploration of specifications and changes
- Visual diff comparison between current specs and proposed changes
- Quick access to common operations without memorizing command syntax

A TUI dashboard using the ink library would provide an interactive, real-time interface that dramatically improves the developer experience for spec-driven development.

## What Changes

- Add new `dashboard` command that launches an interactive TUI
- Integrate ink library for React-based terminal UI components
- Create reusable TUI components for spec visualization
- Support keyboard navigation and shortcuts for common operations
- Provide real-time updates when specs or changes are modified
- Enable split-pane diff visualization
- Add task progress tracking with visual indicators

## Impact

- New specs to create: cli-dashboard
- New dependencies: ink (React for CLIs), ink-text-input, ink-select-input
- Affected code: src/cli/index.ts, src/commands/dashboard.ts (new), src/core/tui/ (new directory)
- Non-breaking: All existing CLI commands remain unchanged
- Backwards compatible: TUI is opt-in via new command