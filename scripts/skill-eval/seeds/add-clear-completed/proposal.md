## Why

Completed todos pile up and there is no way to remove them.

## What Changes

- Before: completed todos stay in the list forever.
- After: a new `clearCompleted()` removes every done todo and returns how many it removed.

## Capabilities

### New Capabilities

### Modified Capabilities
- `todo-list`: completed todos can be cleared.

## Impact

- `src/todo.js` and `test/todo.test.js`.
