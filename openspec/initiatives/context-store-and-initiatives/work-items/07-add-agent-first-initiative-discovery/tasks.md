# Add Agent-First Initiative Discovery Tasks

- [x] Create Item 7 work-item tracking notes.
- [x] Decide `initiative show <id>` is a locator/discovery command.
- [x] Decide default lookup searches all registered context stores.
- [x] Decide `--store` and `--store-path` remain the narrowing selectors.
- [x] Decide duplicate initiative ids are ambiguity errors.
- [x] Decide unreadable stores make default all-store lookup incomplete.
- [x] Decide the v1 projection omits `initiative.status`, `owners`, and
  arbitrary `metadata`.
- [x] Decide the v1 projection keeps `initiative.version` and `created`.
- [x] Decide v1 omits `files` and only returns initiative root plus metadata
  path.
- [x] Decide ambiguity and incomplete-lookup candidates live under diagnostic
  details, not top-level `matches`.
- [x] Decide exact human output direction for success and error states.
- [x] Decide `initiative show` omits `context_store.source`.
- [x] Decide `initiative show` omits a top-level `resolution` field.
- [x] Decide static completion metadata ships with Item 7.
- [x] Decide `readInitiative` returns `null` for absent and throws for invalid.
- [x] Decide incomplete lookup takes precedence over success or ambiguity in
  default all-store mode.
- [x] Decide invalid exact initiative folders are errors, not not-found.
- [x] Implement a focused per-initiative read operation.
- [x] Implement `initiative show`.
- [x] Register static completion metadata for `initiative show`.
- [x] Add focused tests and verification evidence.
