# Add Context Store Foundation Tasks

- [x] Research existing config, registry, file-system, and schema/backend
  patterns.
- [x] Decide to start with Git/local backend identity only, not a generic file
  API.
- [x] Decide that real context store roots are user-chosen Git checkouts or
  synced folders.
- [x] Decide that the local registry lives under global data and portable store
  metadata lives inside the store root.
- [x] Add context-store foundation types, path helpers, parse/serialize, and
  read/write helpers.
- [x] Add focused tests for validation, paths, registry roundtrip, metadata
  roundtrip, and Git/local backend path resolution.
- [x] Run targeted verification.
- [x] Decide registration/resolution facade should precede initiative CLI.
- [x] Add context-store registration/list/resolve facade and tests.
