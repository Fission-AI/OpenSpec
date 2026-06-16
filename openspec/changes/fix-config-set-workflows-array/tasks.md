## 1. Specification

- [x] 1.1 Capture the issue contract in a `cli-config` delta spec
- [x] 1.2 Document the narrow key-aware parsing design

## 2. Implementation

- [x] 2.1 Add key-aware config value coercion for `workflows`
- [x] 2.2 Wire `openspec config set` to use key-aware coercion
- [x] 2.3 Keep `--string` and scalar key behavior unchanged

## 3. Verification

- [x] 3.1 Add unit coverage for key-aware workflow array coercion
- [x] 3.2 Add config command coverage for successful `workflows` array setting
- [x] 3.3 Add config command coverage for invalid `workflows` values that must not save
- [x] 3.4 Run targeted config/schema tests
- [x] 3.5 Add patch changeset for the user-visible CLI fix
