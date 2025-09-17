# TUI Dashboard Technical Design

## Architecture Overview

The TUI dashboard will be built using ink (React for CLIs) to provide a component-based, reactive interface. The architecture follows a clear separation between UI components, state management, and core OpenSpec functionality.

## Technology Stack

- **ink**: React-based terminal UI framework
- **ink-text-input**: Text input component for search
- **ink-select-input**: Selection lists for navigation
- **ink-spinner**: Loading indicators
- **ink-table**: Table component for data display
- **React**: Component model and state management

## Component Hierarchy

```
DashboardApp (root)
├── HeaderBar
│   ├── ProjectInfo
│   ├── Statistics
│   └── Clock
├── MainContent
│   ├── TabBar
│   ├── SpecsView
│   │   ├── SpecsTable
│   │   └── SpecDetails
│   ├── ChangesView
│   │   ├── ChangesTable
│   │   ├── TaskProgress
│   │   └── ChangeDetails
│   └── DiffView
│       ├── SplitPane
│       ├── SpecContent
│       └── DiffHighlighter
├── StatusBar
│   ├── KeyboardShortcuts
│   ├── SearchInput
│   └── Notifications
└── Overlays
    ├── HelpOverlay
    ├── ValidationDashboard
    └── ExportMenu
```

## State Management

Use React's built-in state management with Context API for global state:

```typescript
interface DashboardState {
  specs: Spec[];
  changes: Change[];
  activeTab: 'specs' | 'changes' | 'diff';
  selectedItem: string | null;
  searchQuery: string;
  validationResults: Map<string, ValidationResult>;
  notifications: Notification[];
}
```

## Key Implementation Details

### File Watching
- Use Node.js fs.watch or chokidar for monitoring spec directories
- Debounce file change events to prevent excessive updates
- Queue updates to maintain UI responsiveness

### Performance Optimization
- Implement virtual scrolling for large lists using ink's built-in support
- Cache parsed spec content with TTL
- Use React.memo for expensive components
- Batch state updates to minimize re-renders

### Keyboard Navigation
- Use ink's useInput hook for keyboard handling
- Implement vim-style navigation (j/k for up/down)
- Support both arrow keys and letter shortcuts
- Maintain focus state across tab switches

### Data Flow
1. Core modules (list, diff, validate) provide data
2. Dashboard adapter layer transforms data for UI
3. React components render and handle interactions
4. User actions trigger core module operations
5. File watchers trigger automatic updates

## Example Component Implementation

```typescript
// src/core/tui/components/SpecsTable.tsx
import React from 'react';
import {Box, Text} from 'ink';
import {useSpecs} from '../hooks/useSpecs';

export const SpecsTable: React.FC = () => {
  const {specs, selectedIndex, validation} = useSpecs();
  
  return (
    <Box flexDirection="column">
      {specs.map((spec, index) => (
        <Box key={spec.id} backgroundColor={index === selectedIndex ? 'blue' : undefined}>
          <Text color={validation[spec.id] ? 'green' : 'red'}>
            {validation[spec.id] ? '✓' : '✗'}
          </Text>
          <Text> {spec.id}</Text>
          <Text dimColor> {spec.requirements.length} requirements</Text>
        </Box>
      ))}
    </Box>
  );
};
```

## Integration Points

### With Existing CLI
- Dashboard command added to commander structure
- Reuse existing core modules without modification
- Share configuration and file system utilities

### Error Boundaries
- Wrap main app in error boundary
- Fallback to simple text output on critical errors
- Log errors to file for debugging

## Testing Strategy

### Unit Tests
- Test individual components in isolation
- Mock ink components for testing logic
- Use React Testing Library patterns

### Integration Tests
- Test dashboard with real file system
- Verify keyboard navigation flows
- Test file watching and updates

### Terminal Compatibility
- Test on major terminal emulators (iTerm2, Terminal.app, Windows Terminal)
- Verify color output and Unicode support
- Test with different terminal sizes

## Configuration Schema

```typescript
interface DashboardConfig {
  theme: 'dark' | 'light' | 'auto';
  refreshInterval: number; // milliseconds
  editor: string; // command to open files
  shortcuts: {
    [action: string]: string; // customizable key bindings
  };
  layout: {
    showHeader: boolean;
    showStatusBar: boolean;
    defaultTab: 'specs' | 'changes' | 'diff';
  };
}
```

## Migration Path

Phase 1: Basic dashboard with specs and changes views
Phase 2: Add diff viewer and validation dashboard
Phase 3: Implement search, filters, and export
Phase 4: Add advanced features (themes, customization)

## Performance Targets

- Initial render: <200ms
- Navigation response: <50ms
- File change detection: <1s
- Memory usage: <100MB for 1000 specs
- CPU usage: <5% when idle