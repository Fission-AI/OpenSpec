## Context

`TodoList.add` takes only a title today. Items are plain objects copied on read.

## Decisions

- Pass priority in an options object (`add(title, { priority })`) so later fields do not change the signature again.
- Keep the allowed values in one frozen array, `PRIORITIES`, exported from `src/todo.js`.

## Risks / Trade-offs

- Existing callers keep working because the options object is optional.
