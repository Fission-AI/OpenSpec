## Why

Users with long lists cannot tell which todos matter most. A priority on each todo lets callers sort and highlight the important ones.

## What Changes

- `add(title, { priority })` accepts an optional priority of `low`, `normal`, or `high`, defaulting to `normal`.
- An unknown priority is rejected with an error.
- Every returned item includes its `priority`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `todo-list`: adding a todo records a priority.

## Impact

- `src/todo.js` and `test/todo.test.js`.
