# Tasks

## 1. Property contract
- [x] 1.1 Add `src/telemetry/properties.ts`: the event-name, property-key, and value allowlists, the error-class union, the diagnostic-code map, and the bucketers — all literal declarations, never computed from a schema
- [x] 1.2 Enforce the allowlist immediately before serialization: drop unknown keys and out-of-set values, send the event regardless
- [x] 1.3 Test: a property key built from a schema, change, or store name is dropped and the event still sends
- [x] 1.4 Test: an unrecognized diagnostic code maps to `other` and never appears in the payload

## 2. Correlation and outcome
- [x] 2.1 Generate a per-invocation `run_id`; add `work_session_id` with a 30-minute reuse window
- [x] 2.2 Emit `command_completed` from `postAction` with outcome, error class, bucketed exit code, and bucketed duration excluding prompt-blocked time
- [x] 2.3 Classify in `failWithError`/`emitFailure` so `postAction` reads a class, not an error object; unclassified means `internal_error`
- [x] 2.4 Persist and attach `previous_outcome` and `previous_command_same`
- [x] 2.5 Test: success, user error, internal error, and Ctrl-C each produce the expected outcome and class

## 3. Outcome coverage
- [x] 3.1 Convert the `process.exit()` call sites in `src/cli/index.ts`, `src/core/view.ts`, `src/core/init.ts`, `src/ui/welcome-screen.ts`, and `src/commands/feedback.ts` to set `process.exitCode` and return
- [x] 3.2 Intercept commander's usage errors so unknown commands and bare groups emit `bad_usage`, preserving commander's exit code
- [x] 3.3 Handle an escaped rejection as `internal_error` while preserving existing exit behavior
- [x] 3.4 Ensure a cancelled run never waits on a telemetry request
- [x] 3.5 Assert no telemetry path prompts, blocks, or writes to stdout
- [x] 3.6 Test: a failing command emits exactly one `command_completed` and exits with the same code as before; `--help` and `--version` emit none

## 4. Run context
- [x] 4.1 Collect the bounded context; count tools rather than naming them; derive `invoker` from a compile-time marker list without sending any env name or value
- [x] 4.2 Bucket the change count from a single non-recursive directory read, discarding names
- [x] 4.3 Cap the invocation at four events
- [x] 4.4 Test: a user-named schema, store, change, and tool set never appear in any payload

## 5. Milestones and persisted state
- [x] 5.1 Persist the milestone set, first-seen time, reported tool set, work session, and previous outcome; write none of it when telemetry is disabled
- [x] 5.2 Emit `milestone_reached` once per milestone with `version` and `time_to_reach`, omitting the bucket for ids that predate the recorded time
- [x] 5.3 Emit `tool_configured` once per registry tool id, carrying no run context
- [x] 5.4 Test: the milestone fires once, never on failure, and an opted-out run leaves the config untouched
- [x] 5.5 Test: `tool_configured` fires once per tool and carries no context property

## 6. Inspection and controls
- [x] 6.1 Add `OPENSPEC_TELEMETRY_DEBUG=1` — print payloads to stderr, send nothing, work when opted out, never create an anonymous id
- [x] 6.2 Surface state through `openspec config get telemetry`: enabled, id, file path
- [x] 6.3 Test: debug mode prints, sends nothing, leaves `--json` stdout valid, and writes no config

## 7. Disclosure
- [x] 7.1 Update `README.md`, `SECURITY.md`, and the environment-variable reference with every event, property, and persisted field, the retention period, the deletion contact, and the debug flag
- [x] 7.2 Replace unqualified "anonymous" with "pseudonymous" in the docs and the notice; state that the id identifies a config directory, not a person
- [x] 7.3 Record the narrowed "no environment" and "only command names and version" commitments in `CHANGELOG.md` under a `Privacy` heading
- [x] 7.4 Add `noticeVersion` and a one-line notice naming what changed for users who saw the earlier scope
- [x] 7.5 Test: an allowlisted property absent from the disclosure documents fails the build

## 8. Ingest
- [ ] 8.1 Confirm the `edge.openspec.dev` proxy does not log or forward client IPs; disable GeoIP enrichment on the telemetry project
- [ ] 8.2 Publish the retention period and configure it in PostHog
