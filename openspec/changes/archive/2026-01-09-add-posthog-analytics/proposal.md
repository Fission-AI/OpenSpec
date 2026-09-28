## Why

OpenSpec currently has no visibility into how the tool is being used. Without analytics, we cannot:
- Understand which commands and features are most valuable to users
- Measure adoption and usage patterns
- Make data-driven decisions about product development

Adding PostHog analytics enables product insights while respecting user privacy through transparent, opt-out telemetry.

## What Changes

- Add PostHog Node.js SDK as a dependency
- Implement telemetry system with environment variable opt-out
- Track command usage (command name and version only)
- Show first-run notice informing users about telemetry
- Store anonymous ID in global config (`~/.config/openspec/config.json`)
- Respect `DO_NOT_TRACK` and `OPENSPEC_TELEMETRY=0` environment variables
- Auto-disable in CI environments

## Capabilities

### New Capabilities

- `telemetry`: Anonymous usage analytics using PostHog. Covers command tracking, opt-out controls, and first-run disclosure notice.

### Modified Capabilities

- `global-config`: Add telemetry state storage (anonymous ID, notice seen flag)

## Impact

- **Dependencies**: Add `posthog-node` package
- **Privacy**: Opt-out via env var, no personal data collected, clear disclosure
- **Configuration**: New global config fields for telemetry state
- **Network**: Async event sending with flush on exit (~100-300ms added)
- **CI/CD**: Telemetry auto-disabled when `CI=true`
- **Documentation**: Update README with telemetry disclosure
