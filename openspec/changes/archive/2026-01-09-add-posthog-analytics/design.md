## Context

OpenSpec needs usage analytics to understand adoption and inform product decisions. PostHog provides a privacy-conscious analytics platform suitable for open source projects.

## Goals / Non-Goals

**Goals:**
- Track daily/weekly/monthly active usage
- Understand command usage patterns
- Keep implementation minimal and privacy-respecting
- Enable opt-out with minimal friction

**Non-Goals:**
- Detailed error tracking or diagnostics
- User identification or profiling
- Complex event hierarchies
- Full CLI command for telemetry management (env var sufficient for now)

## Decisions

### Opt-Out Model

**Decision:** Telemetry enabled by default, opt-out via environment variable.

```bash
OPENSPEC_TELEMETRY=0    # Disable telemetry
DO_NOT_TRACK=1          # Industry standard, also respected
```

Auto-disabled when `CI=true` is detected.

**Rationale:**
- Opt-in typically yields ~3% participation—not enough for meaningful data
- Understanding usage patterns requires statistically significant sample sizes
- Environment variable opt-out is simple and immediate
- Respecting `DO_NOT_TRACK` follows industry convention

**Alternatives considered:**
- Opt-in only - Insufficient data for product decisions
- Config file setting - More complex, env var sufficient for MVP
- Full `openspec telemetry` command - Can add later if users request

### Event Design

**Decision:** Single event type with minimal properties.

```typescript
{
  event: 'command_executed',
  properties: {
    command: 'init',      // Command name only
    version: '1.2.3'      // OpenSpec version
  }
}
```

**Rationale:**
- Answers the core questions: how much usage, which commands are popular
- PostHog derives DAU/WAU/MAU from anonymous user counts over time
- No arguments, paths, or content—clean privacy story
- Easy to explain in disclosure notice

**Not tracked:**
- Command arguments
- File paths or contents
- Error messages or stack traces
- Project names or spec content
- IP addresses (`$ip: null` explicitly set)

### Anonymous ID

**Decision:** Random UUID, lazily generated on first telemetry send, stored in global config.

```typescript
// ~/.config/openspec/config.json
{
  "telemetry": {
    "anonymousId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
}
```

**Rationale:**
- Random UUID has no relation to the person—can't be reversed
- Stored in config so same user = same ID across sessions (needed for DAU/WAU/MAU)
- Lazy generation means no ID created if user opts out before first command
- User can delete config to reset identity

**Alternatives considered:**
- Machine-derived hash (hostname, MAC) - Feels invasive, fingerprint-like
- Per-session UUID - Breaks user counting metrics entirely

### SDK Configuration

**Decision:** PostHog Node SDK with immediate flush, shutdown on exit.

```typescript
const posthog = new PostHog(API_KEY, {
  flushAt: 1,        // Send immediately, don't batch
  flushInterval: 0   // No timer-based flushing
});

// Before CLI exits
await posthog.shutdown();
```

**Rationale:**
- CLI processes are short-lived; batching would lose events
- `flushAt: 1` ensures each event sends immediately
- `shutdown()` guarantees flush before process exit
- Adds ~100-300ms to exit—negligible for typical CLI workflows

**Error handling:**
- Network failures silently ignored (telemetry shouldn't break CLI)
- `shutdown()` wrapped in try/catch

### Hook Location

**Decision:** Commander.js `preAction` and `postAction` hooks.

```typescript
program
  .hook('preAction', (thisCommand) => {
    maybeShowTelemetryNotice();
    trackCommand(thisCommand.name(), VERSION);
  })
  .hook('postAction', async () => {
    await shutdown();
  });
```

**Rationale:**
- Centralized—one place for all telemetry logic
- Automatic—new commands get tracked without code changes
- Clean separation—command handlers don't know about telemetry

**Subcommand handling:**
- Track full command path for nested commands (e.g., `change:apply`)

### First-Run Notice

**Decision:** One-liner on first command ever, stored "seen" flag in config.

```
Note: OpenSpec collects anonymous usage stats. Opt out: OPENSPEC_TELEMETRY=0
```

**Rationale:**
- First command (not just `init`) ensures notice is always seen
- Non-blocking—no prompt, just informational
- One-liner is visible but not intrusive
- Storing "seen" in config prevents repeated display

**Config after first run:**
```json
{
  "telemetry": {
    "anonymousId": "...",
    "noticeSeen": true
  }
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Users prefer opt-in | Clear disclosure, trivial opt-out, transparent about what's collected |
| GDPR concerns | No personal data, no IP, user can delete config |
| Slows CLI exit by ~200ms | Negligible for most workflows; can optimize if needed |
| PostHog outage affects CLI | Fire-and-forget with timeout; failures are silent |

## Open Questions

None—design is intentionally minimal. Future enhancements (dedicated command, workflow tracking) can be added based on user feedback.
