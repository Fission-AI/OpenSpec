## Why

OpenSpec currently has no visibility into how the tool is being used. Without analytics, we cannot:
- Understand which commands and features are most valuable to users
- Measure adoption of experimental features (OPSX workflow vs standard)
- Identify pain points (validation failures, abandoned init flows)
- Make data-driven decisions about product development
- Track the health of the tool across different AI assistant integrations

Adding PostHog analytics enables product insights while respecting user privacy through opt-in telemetry.

## What Changes

- Add PostHog Node.js SDK as a dependency
- Implement opt-in telemetry system with clear user consent
- Track key CLI events: command usage, init flow completion, feature adoption
- Add `openspec telemetry` command to manage opt-in/opt-out preferences
- Store telemetry preference in global config (`~/.openspec/config.yaml`)
- Respect `DO_NOT_TRACK` environment variable as per industry convention

## Capabilities

### New Capabilities

- `telemetry`: Opt-in analytics system using PostHog. Covers event tracking, user consent management, privacy controls, and the telemetry CLI command.

### Modified Capabilities

- `global-config`: Add telemetry preference storage (enabled/disabled, anonymous ID)
- `cli-init`: Prompt user about telemetry opt-in during first run

## Impact

- **Dependencies**: Add `posthog-node` package
- **Privacy**: Must be opt-in only, with clear disclosure of what's tracked
- **Configuration**: New global config fields for telemetry state
- **Network**: Async event sending (non-blocking, fire-and-forget)
- **CI/CD**: Telemetry auto-disabled in CI environments
- **Documentation**: Update README with telemetry disclosure
