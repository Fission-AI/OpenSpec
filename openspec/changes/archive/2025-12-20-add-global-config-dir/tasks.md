## 1. Core Implementation

- [x] 1.1 Create `src/core/global-config.ts` with path resolution
  - Implement `getGlobalConfigDir()` following XDG spec
  - Support `$XDG_CONFIG_HOME` environment variable override
  - Platform-specific fallbacks (Unix: `~/.config/`, Windows: `%APPDATA%`)
- [x] 1.2 Define TypeScript interfaces for config shape
  - `GlobalConfig` interface with optional fields
  - Start minimal: just `featureFlags?: Record<string, boolean>`
- [x] 1.3 Implement config loading with defaults
  - `getGlobalConfig()` - reads config.json if exists, merges with defaults
  - No directory/file creation on read (lazy initialization)
- [x] 1.4 Implement config saving
  - `saveGlobalConfig(config)` - writes config.json, creates directory if needed

## 2. Integration

- [x] 2.1 Export new module from `src/core/index.ts`
- [x] 2.2 Add constants for config file name and directory name

## 3. Testing

- [x] 3.1 Manual testing of path resolution on current platform
- [x] 3.2 Test with/without `$XDG_CONFIG_HOME` set
- [x] 3.3 Test config load when file doesn't exist (should return defaults)
- [x] 3.4 Unit tests in `test/core/global-config.test.ts` (18 tests)
