## 1. Setup

- [x] 1.1 Add `posthog-node` package as a dependency
- [x] 1.2 Create `src/telemetry/` module directory
- [x] 1.3 Add PostHog API key configuration (environment variable or embedded)

## 2. Global Config

- [x] 2.1 Create or extend global config module for `~/.config/openspec/config.json`
- [x] 2.2 Implement read/write functions that preserve existing config fields
- [x] 2.3 Define telemetry config structure (`anonymousId`, `noticeSeen`)

## 3. Core Telemetry Module

- [x] 3.1 Implement `isTelemetryEnabled()` checking `OPENSPEC_TELEMETRY`, `DO_NOT_TRACK`, and `CI` env vars
- [x] 3.2 Implement `getOrCreateAnonymousId()` with lazy UUID generation
- [x] 3.3 Initialize PostHog client with `flushAt: 1` and `flushInterval: 0`
- [x] 3.4 Implement `trackCommand(commandName, version)` with `$ip: null`
- [x] 3.5 Implement `shutdown()` with try/catch for silent failure handling

## 4. First-Run Notice

- [x] 4.1 Implement `maybeShowTelemetryNotice()` function
- [x] 4.2 Check `noticeSeen` flag before displaying notice
- [x] 4.3 Display notice text: "Note: OpenSpec collects anonymous usage stats. Opt out: OPENSPEC_TELEMETRY=0"
- [x] 4.4 Update `noticeSeen` in config after first display

## 5. CLI Integration

- [x] 5.1 Add Commander.js `preAction` hook to show notice and track command
- [x] 5.2 Add Commander.js `postAction` hook to call shutdown
- [x] 5.3 Handle subcommand path extraction (e.g., `change:apply`)

## 6. Testing

- [x] 6.1 Test opt-out via `OPENSPEC_TELEMETRY=0`
- [x] 6.2 Test opt-out via `DO_NOT_TRACK=1`
- [x] 6.3 Test auto-disable in CI environment
- [x] 6.4 Test first-run notice display and noticeSeen persistence
- [x] 6.5 Test anonymous ID generation and persistence
- [x] 6.6 Test silent failure on network error (mock PostHog)

## 7. Documentation

- [x] 7.1 Add telemetry disclosure section to README
- [x] 7.2 Document opt-out methods (`OPENSPEC_TELEMETRY=0`, `DO_NOT_TRACK=1`)
- [x] 7.3 Document what data is collected and not collected
