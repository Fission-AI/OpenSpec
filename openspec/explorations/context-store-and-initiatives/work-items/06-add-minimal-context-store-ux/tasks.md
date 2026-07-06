# Add Minimal Context Store UX Tasks

- [x] Create Item 6 work-item tracking notes.
- [x] Capture agent-first setup and discovery direction.
- [x] Decide `context-store` is the first CLI namespace.
- [x] Decide setup defaults to `./<id>` when `--path` is omitted.
- [x] Decide current-directory setup requires explicit `--path .`.
- [x] Record that checked-in store metadata stays minimal.
- [x] Decide checked-in store metadata is exactly `.openspec-store/store.yaml`
  and contains portable identity only.
- [x] Record that machine-local registry state stays outside the store.
- [x] Record that `initiative list` should default across registered stores.
- [x] Decide setup interactive and non-interactive behavior.
- [x] Decide register behavior.
- [x] Decide context-store list is registry index only.
- [x] Decide doctor owns health checks.
- [x] Decide initiative list partial-success behavior.
- [x] Decide JSON and exit behavior for partial success and total failure.
- [x] Decide id inference uses folder/repo name as-is with normal validation.
- [x] Decide setup rejects non-empty folders without context-store metadata.
- [x] Decide registry path/id conflicts fail for now.
- [x] Decide empty states for list, doctor, and initiative list.
- [x] Initially defer completion metadata; later add static metadata with the
  rest of the shipped command surface.
- [x] Finalize exact JSON payload fields for setup, register, list, doctor, and
  all-store initiative list.
- [x] Implement `context-store setup/register/list/doctor`.
- [x] Update `initiative list` all-store behavior and output.
- [x] Add focused tests and verification evidence.
