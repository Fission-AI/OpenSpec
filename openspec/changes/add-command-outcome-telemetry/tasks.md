# Tasks

## 1. Property contract
- [ ] 1.1 Add `src/telemetry/properties.ts` declaring the property allowlist, the error-class allowlist, the diagnostic-code→error-class map, and the count bucketer
- [ ] 1.2 Add a test asserting every property a built event carries is on the allowlist
- [ ] 1.3 Add a test asserting an unrecognized diagnostic code maps to `other` and the raw code never appears in the payload

## 2. Session and outcome
- [ ] 2.1 Generate a per-invocation `session_id` and attach it to every event
- [ ] 2.2 Record the `preAction` start time; emit `command_completed` from `postAction` with outcome, error class, exit code, and duration
- [ ] 2.3 Classify the failure in `failWithError`/`emitFailure` so `postAction` reads a class, not an error object
- [ ] 2.4 Test: success, user error, internal error, and Ctrl-C each produce the expected outcome and error class

## 3. Outcome coverage
- [ ] 3.1 Convert the `process.exit(1)` call sites in `src/cli/index.ts` to set `process.exitCode` and return
- [ ] 3.2 Flush explicitly at any exit path that cannot return
- [ ] 3.3 Test: a failing command emits exactly one `command_completed` and exits with the same code as before

## 4. Run context
- [ ] 4.1 Collect the bounded context, membership-checking tool ids and omitting anything that throws
- [ ] 4.2 Bucket change and spec counts from a single non-recursive directory read, discarding names
- [ ] 4.3 Test: a user-named schema, store, and change never appear in any payload

## 5. Milestones
- [ ] 5.1 Persist reached milestones and the install date in the telemetry config section
- [ ] 5.2 Emit `milestone_reached` once per milestone on first success
- [ ] 5.3 Test: the milestone fires once, never on failure, and never when telemetry is disabled

## 6. Inspection and disclosure
- [ ] 6.1 Add `OPENSPEC_TELEMETRY_DEBUG=1` — print each payload to stderr, send nothing
- [ ] 6.2 Update `README.md`, `SECURITY.md`, and the environment-variable reference with the full property list and the debug flag
- [ ] 6.3 Test: debug mode prints, sends nothing, and leaves `--json` stdout valid
