## ADDED Requirements

### Requirement: Bounded property contract
Every event name, property key, and property value SHALL be a member of a compile-time constant list declared in source. A property value SHALL be one of: a member of such a list, a boolean, or a bucket label from a fixed bucket list.

An event name or property key SHALL NOT be constructed by concatenation, interpolation, or any other transformation of a runtime value. Binding only values would leave the guarantee open: `{"schema:acme-internal": true}` carries a boolean value and still ships the user's schema name.

A property value SHALL NOT be derived from user-authored text. This includes, and is not limited to: change ids, spec ids, schema ids, artifact ids, store ids, store remotes, store branches, store local paths, `defaultStore`, `featureFlags` keys, `openers` content, file paths, project names, error messages, and command arguments.

Where a value comes from a set the user can extend, the system SHALL check membership against the compile-time list and SHALL substitute a fixed fallback label (or omit the property) when the value is not a member. The system SHALL NOT pass such a value through unchecked.

The allowlist SHALL be authoritative at send time, not only at build time. Immediately before serialization the system SHALL drop any property whose key is not on the allowlist, and any value that is not a member of that property's declared value set. A dropped property SHALL NOT prevent the event from being sent. Enforcement in a test alone is insufficient: a test passes vacuously for any code path it does not construct.

The lists SHALL be literal declarations in source. They SHALL NOT be computed from a schema, catalog, or any other file the user can author.

A property SHALL NOT be added where the joint distribution of an event's properties would make a substantial fraction of runs unique. A set-valued property drawn from a registry of more than eight members SHALL be sent as a count bucket rather than as a set.

#### Scenario: Value from a closed constant list
- **WHEN** the system records the active install profile
- **THEN** the property value is one of the values declared by the `Profile` type (`core`, `custom`)

#### Scenario: Value from a user-extensible set
- **WHEN** a user has forked a schema into `openspec/schemas/acme-internal/`
- **AND** a command runs against that schema
- **THEN** no property key or value carries the string `acme-internal`
- **AND** the schema is described only by where it was loaded from (`package`, `project`, or `user`)

#### Scenario: Property key derived from a runtime value
- **WHEN** code attempts to send a property whose key embeds a schema, change, or store name
- **THEN** the key is not on the allowlist
- **AND** the property is dropped before the event is serialized

#### Scenario: Unknown property dropped at send time
- **WHEN** a code path adds a property that is not on the allowlist
- **THEN** the property is dropped immediately before serialization
- **AND** the event is still sent with its remaining properties

#### Scenario: Counts are bucketed
- **WHEN** the system records how many active changes a project has
- **THEN** the property value is a bucket label from a fixed list, not the exact count

#### Scenario: New property without a closed value set
- **WHEN** a proposed property's value set cannot be enumerated at build time
- **THEN** the property SHALL NOT be added to any event

### Requirement: Command outcome tracking
The system SHALL send a `command_completed` event after every command finishes, whether it succeeded or failed, carrying `command`, `version`, `surface`, `run_id`, `work_session_id`, `outcome`, `error_class`, `exit_code`, and `duration`.

`outcome` SHALL be one of: `success`, `user_error`, `internal_error`, `cancelled`.

`command` SHALL be the command path commander resolved, checked for membership in the registered command list, and sent as `unknown` when it is not a member. It SHALL NOT be derived from what the user typed.

`exit_code` SHALL be a bucket label from the fixed list `0`, `1`, `130`, `other`. It SHALL NOT be the raw process exit code, because several commands pass a child process's code through unchanged — `workset open` returns the launched editor's code (including `128 + signal`), `feedback` returns `gh`'s status, and `update` returns the re-spawned CLI's code. A raw code would be an unbounded value.

`duration` SHALL be a bucket label from the fixed list `<100`, `100-500`, `500-2000`, `2000-10000`, `10000+`, measured in milliseconds from the start of the `preAction` hook, excluding any time the process spent blocked on an interactive prompt.

Raw millisecond durations SHALL NOT be sent. Full-resolution timings profile the machine's performance, leak repo scale past the count buckets, and — on interactive commands — record human response times, which are a behavioral biometric. Excluding prompt-blocked time is also what makes the measurement mean anything: `init`, `archive`, and `config` all prompt, so an unexcluded duration measures how long someone read a menu.

A command that fails a check it was asked to perform — a failing `validate`, an `archive` blocked by incomplete tasks — SHALL be recorded as `user_error`, never `internal_error`. Failing a check is a routine outcome of the command working correctly.

#### Scenario: Successful command
- **WHEN** a command completes with exit code 0
- **THEN** the system sends `command_completed` with `outcome: "success"`, `error_class: "none"`, and `exit_code: "0"`

#### Scenario: Failed command
- **WHEN** a command fails and sets a non-zero exit code
- **THEN** the system sends `command_completed` with a non-`success` outcome and a classified `error_class`

#### Scenario: Exit code passed through from a child process
- **WHEN** `openspec workset open` exits with the launched editor's code of 137
- **THEN** the event carries `exit_code: "other"`
- **AND** no property carries the value 137

#### Scenario: Failing validation is not an internal error
- **WHEN** `openspec validate` runs correctly and reports the change is invalid
- **THEN** the event carries `outcome: "user_error"` and `error_class: "validation_failed"`

#### Scenario: Time spent at a prompt is excluded
- **WHEN** a command waits four minutes for a user to answer a confirmation prompt and then finishes in 300ms of work
- **THEN** the event carries `duration: "100-500"`

#### Scenario: Unregistered command name
- **WHEN** the resolved command path is not a member of the registered command list
- **THEN** the event carries `command: "unknown"`

#### Scenario: No message content
- **WHEN** a command fails with the message `Change "acme-billing-rewrite" not found`
- **THEN** the event carries `error_class: "item_not_found"` and no part of the message

### Requirement: Bounded error classification
The system SHALL classify a failure into an `error_class` drawn from a compile-time allowlist declared as a literal string union in source. A failure whose class cannot be determined SHALL be recorded as `error_class: "other"` with `outcome: "internal_error"`, never `user_error`. A failure we did not anticipate is our problem until shown otherwise, and biasing the other way would make the `internal_error` rate structurally under-report the exact thing it exists to surface.

Where a failure carries a diagnostic `code` (as `StoreError` and `RootSelectionError` do), the system SHALL map that code through the allowlist and SHALL NOT send the code through unchecked, because a diagnostic code is not guaranteed to be free of user-authored text.

The allowlist SHALL cover at minimum these classes, which correspond to the failure families the CLI actually has:

| Class | Covers |
| --- | --- |
| `none` | Success |
| `cancelled` | Ctrl-C at a prompt, a declined confirmation |
| `not_interactive` | A prompt was needed but stdin/stdout is not a terminal, or `--json` was passed. Distinct from `cancelled`: the user was never asked |
| `no_root` | No OpenSpec root resolved, no registered store, unhealthy or mismatched store root |
| `item_not_found` | A named change, spec, workset, or store does not exist |
| `ambiguous_item` | A name matched more than one item |
| `schema_not_found` | A schema, artifact, or template could not be resolved |
| `schema_invalid` | A schema failed its own validation |
| `bad_usage` | Bad flags or arguments, including commander's own usage errors |
| `unknown_subcommand` | A group was given an operand it does not recognize |
| `validation_failed` | Content failed validation — a routine outcome, not an exception |
| `archive_blocked` | Archive refused a precondition: incomplete tasks, existing target, failed spec validation |
| `concurrent_modification` | The working tree changed underneath a command mid-operation |
| `store_error` | Store registration, metadata, identity, or path failures |
| `git_error` | Store git init, identity, commit, or remote failures |
| `fs_error` | Permission denied, path outside the allowed directory, not writable, not a directory |
| `parse_error` | A markdown or YAML document could not be parsed |
| `metadata_invalid` | Change metadata was missing or malformed |
| `external_tool_failed` | A launched editor, agent, or the `gh` CLI failed |
| `network_error` | An outbound request failed |
| `already_exists` | A create operation found its target already present |
| `internal_error` | An error that escaped a command's own handling |
| `other` | Anything unmapped |

#### Scenario: Known diagnostic code
- **WHEN** a command fails with diagnostic code `unknown_item`
- **THEN** the event carries the mapped `error_class: "item_not_found"`

#### Scenario: Unrecognized diagnostic code
- **WHEN** a command fails with a diagnostic code that is not in the allowlist
- **THEN** the event carries `error_class: "other"`
- **AND** the raw code is not sent

#### Scenario: Unclassified error
- **WHEN** a command fails with a plain `Error` carrying no diagnostic
- **THEN** the event carries `error_class: "other"`
- **AND** carries `outcome: "internal_error"`

### Requirement: Outcome coverage across exit paths
Every exit path that reaches the CLI's own error handling SHALL produce exactly one `command_completed` event before the process exits. Paths outside that handling — an OOM kill, `SIGKILL`, a crash in the runtime itself — cannot emit and are out of scope.

Three families of exit currently bypass commander's `postAction` hook, and all three SHALL be covered:

1. **Action handlers that call `process.exit()`.** These SHALL set `process.exitCode` and return instead, so the hook runs. This covers the seventeen `process.exit(1)` sites in `src/cli/index.ts`, the `process.exit(1)` in `src/core/view.ts` and the `config` group guard, and the `process.exit(0)` success paths in `src/core/init.ts`, `src/ui/welcome-screen.ts`, and `src/commands/feedback.ts`.
2. **Commander's own usage errors.** Unknown option, unknown command, missing argument, excess arguments, and a group invoked with no subcommand all exit before the `preAction` hook runs, so today they produce no event at all. The system SHALL intercept these and emit `command_completed` with `error_class: "bad_usage"` before exiting with the code commander chose.
3. **A rejected action promise.** Commander chains hooks without a `catch`, so a throw that escapes a command's own handler skips `postAction` and becomes an unhandled rejection. The system SHALL install a handler that emits `command_completed` with `outcome: "internal_error"` and then preserves the existing exit behavior.

Telemetry flushing is asynchronous, so the system SHALL NOT rely on a `process.on('exit')` handler, which cannot await.

`--help` and `--version` SHALL NOT emit a `command_completed` event.

#### Scenario: Failing command reaches the completion hook
- **WHEN** a command fails
- **THEN** the process does not call `process.exit()` before the `postAction` hook has run
- **AND** exactly one `command_completed` event is sent

#### Scenario: Exit code preserved
- **WHEN** a failing command sets `process.exitCode` instead of calling `process.exit()`
- **THEN** the process still exits with the same code it exited with before this change

#### Scenario: Unknown command
- **WHEN** a user runs `openspec proposal` and commander rejects it as an unknown command
- **THEN** the system sends `command_completed` with `error_class: "bad_usage"`
- **AND** the process still exits with the code commander chose

#### Scenario: Group invoked with no subcommand
- **WHEN** a user runs `openspec spec` with no subcommand and commander prints help and exits 1
- **THEN** the system sends `command_completed` with `error_class: "bad_usage"`

#### Scenario: Help and version are not commands
- **WHEN** a user runs `openspec --help` or `openspec --version`
- **THEN** no `command_completed` event is sent

#### Scenario: Error escaping a command handler
- **WHEN** an action handler rejects with an error its own catch does not cover
- **THEN** the system sends `command_completed` with `outcome: "internal_error"`
- **AND** the process exits as it did before this change

#### Scenario: No duplicate events
- **WHEN** a command both sets an exit code and returns normally
- **THEN** exactly one `command_completed` event is sent for that invocation

### Requirement: Cancellation never delays exit
A cancelled run SHALL NOT delay process exit in order to send or flush telemetry. Where the event cannot be dispatched without delaying exit, it SHALL be dropped.

Ctrl-C is the user asking the process to stop. A request that holds the process open for up to the telemetry timeout while the user presses Ctrl-C again is a worse outcome than a lossy cancellation metric, and the ratio is all the metric is used for.

#### Scenario: Ctrl-C during a command
- **WHEN** a user presses Ctrl-C
- **THEN** the process exits without waiting on a telemetry request
- **AND** the cancellation event is dropped if it cannot be sent without waiting

#### Scenario: Cancellation recorded when it is free
- **WHEN** a command exits 130 through the normal completion hook
- **THEN** the system sends `command_completed` with `outcome: "cancelled"` and `error_class: "cancelled"`

### Requirement: Run and work session correlation
The system SHALL generate a random UUID per CLI invocation and include it as `run_id` on every event from that invocation. The `run_id` SHALL NOT be persisted to disk and SHALL NOT be derived from the anonymous id, the process id, the working directory, or the clock.

`run_id` pairs `command_executed` with `command_completed`. Its job is to reveal when that pair is broken — an invocation that started and never completed is the signature of an exit path this spec failed to cover.

The system SHALL additionally maintain a `work_session_id`: a random UUID persisted in the telemetry config section alongside the time of last activity. It SHALL be reused when the last activity was less than 30 minutes ago and regenerated otherwise. The value SHALL be random; only the reuse window consults the clock.

A CLI work session is many invocations, not one. Without a correlation unit spanning them, command sequences and within-session drop-off are not computable at all.

#### Scenario: Same run id across one invocation's events
- **WHEN** one invocation sends multiple events
- **THEN** every event carries the same `run_id`

#### Scenario: Different run id across invocations
- **WHEN** the same user runs two commands in sequence
- **THEN** the two invocations carry different `run_id` values
- **AND** both carry the same `anonymousId` as `distinct_id`

#### Scenario: Work session continues across invocations
- **WHEN** a user runs a second command ten minutes after the first
- **THEN** both invocations carry the same `work_session_id`

#### Scenario: Work session expires
- **WHEN** a user runs a command more than 30 minutes after their last one
- **THEN** the invocation carries a newly generated `work_session_id`

#### Scenario: Run id not persisted
- **WHEN** an invocation ends
- **THEN** no `run_id` is written to the global config file

### Requirement: Retry visibility
The system SHALL persist the outcome and command of the previous invocation in the telemetry config section, and SHALL include `previous_outcome` (an `outcome` value or `none`) and `previous_command_same` (boolean) on `command_completed`.

Whether a user recovers from a failure is the most actionable maintainer signal available, and it is not otherwise computable: a funnel cannot express "same command, previously failed, now succeeded" without raw queries.

Only the outcome label and a boolean SHALL be stored. The previous command name SHALL be compared locally and SHALL NOT be sent.

#### Scenario: Successful retry
- **WHEN** a user runs a command that fails, then runs the same command again and it succeeds
- **THEN** the second event carries `previous_outcome: "user_error"` and `previous_command_same: true`

#### Scenario: First invocation ever
- **WHEN** no previous invocation is recorded
- **THEN** the event carries `previous_outcome: "none"`

#### Scenario: Different command
- **WHEN** the previous invocation was a different command
- **THEN** the event carries `previous_command_same: false`

### Requirement: Bounded run context
The system SHALL attach run context to `command_completed`. Every context property SHALL satisfy the bounded property contract.

The context SHALL be limited to: `platform` (`darwin`, `linux`, `win32`, `other`), `node_major` (a label from a fixed list of supported majors, `other` otherwise), `install_kind` (`global`, `npx`, `source`, `other`), `invoker`, `stdout_tty` (boolean), `json_mode` (boolean), `prompted` (boolean), `profile`, `delivery`, `tools_count` (bucket), `schema_source` (`package`, `project`, `user`), `store_in_use` (boolean), `changes` (bucket), and `first_run` (boolean).

`tools_count` SHALL be a bucket label from `0`, `1`, `2-3`, `4+`. The identities of the configured tools SHALL NOT appear on a per-run event. The registry holds tens of tools, so a set drawn from it carries more than enough entropy to make an off-the-mode user unique when joined with the rest of the context — which is the whole risk, since it would attach a real-world identity to the anonymous id rather than merely linking sessions.

`invoker` SHALL be a label from a fixed list of known coding-agent environments, `terminal` when none matches and stdout is a terminal, and `unknown` otherwise. It SHALL be derived by testing for the presence of a compile-time list of environment markers. No environment variable name or value SHALL be sent, and an unrecognized marker SHALL collapse to `unknown`. The markers probed SHALL be named in the public disclosure.

`prompted` SHALL be true when the invocation opened any interactive prompt.

`first_run` SHALL be true only on the invocation during which the anonymous id is generated. It is not per-project.

Count buckets SHALL use the fixed labels `0`, `1-3`, `4-10`, `11-30`, `31+`.

Collecting run context SHALL NOT add filesystem traversal beyond a single non-recursive directory read per counted collection. Any context value that cannot be read cheaply or throws SHALL be omitted, and the event SHALL still be sent.

#### Scenario: Context collection failure
- **WHEN** reading the changes directory throws
- **THEN** the `changes` property is omitted
- **AND** the `command_completed` event is still sent with its remaining properties

#### Scenario: Store in use
- **WHEN** a command resolves its root through a registered store
- **THEN** the event carries `store_in_use: true`
- **AND** carries no store id, remote, branch, or path

#### Scenario: Configured tools are counted, not named
- **WHEN** a user has three AI tools configured
- **THEN** the event carries `tools_count: "2-3"`
- **AND** carries no tool identity

#### Scenario: Agent-driven run
- **WHEN** a command is run inside a recognized coding agent
- **THEN** the event carries that agent's `invoker` label
- **AND** carries no environment variable name or value

#### Scenario: Unrecognized environment
- **WHEN** no known agent marker is present and stdout is not a terminal
- **THEN** the event carries `invoker: "unknown"`

#### Scenario: Interactive run is marked
- **WHEN** a command opens a confirmation prompt
- **THEN** the event carries `prompted: true`

#### Scenario: No traversal for counts
- **WHEN** the system counts active changes
- **THEN** it performs a single non-recursive directory read and discards the entry names, keeping only the bucketed count

### Requirement: Activation milestone events
The system SHALL send a `milestone_reached` event the first time a user reaches each of `install`, `init`, `propose`, `apply`, and `archive`, carrying `milestone`, `version`, `run_id`, and `time_to_reach`.

`install` SHALL be recorded on the invocation that generates the anonymous id. Without it the activation funnel has no denominator. The remaining milestones SHALL be recorded on first successful completion of the corresponding command.

A milestone SHALL be recorded at most once per anonymous id. The set of milestones already reached SHALL be persisted in the global config under the telemetry section.

`time_to_reach` SHALL use the fixed labels `<1h`, `1-24h`, `1-7d`, `8-30d`, `31d+`, computed from a date recorded when the anonymous id is first generated.

The sub-day buckets are deliberate. Whether a user reaches their first archived change in one sitting or on the fourth day is the difference between a tool that lands and one that needs a second attempt, and it is the activation question an investor asks by name. A coarser first bucket makes the two indistinguishable.

The residual risk is stated rather than hidden: a `<1h` milestone, combined with the server's own receipt time, dates that user's first run to within the hour. This is accepted because the run context no longer carries a fingerprint to join it against — tool identities are decoupled, durations and exit codes are bucketed — so the value dates a cohort rather than identifying a person. The recorded date SHALL NOT be sent directly, only the bucket.

The recorded date is the first run with telemetry enabled, not the install. It SHALL be named accordingly and SHALL NOT be described as an install date.

Where an anonymous id predates the recorded date, `time_to_reach` SHALL be omitted rather than sent as the lowest bucket, which would fabricate a wave of instant activations across the existing userbase.

#### Scenario: First successful archive
- **WHEN** a user archives a change successfully for the first time
- **THEN** the system sends `milestone_reached` with `milestone: "archive"` and the current `version`

#### Scenario: Subsequent archive
- **WHEN** the same user archives another change later
- **THEN** no further `archive` milestone event is sent

#### Scenario: Failed command reaches no milestone
- **WHEN** a command fails
- **THEN** no milestone is recorded for it

#### Scenario: Existing user with no recorded date
- **WHEN** a user whose anonymous id predates this change reaches a milestone
- **THEN** the event omits `time_to_reach`

#### Scenario: Milestones respect opt-out
- **WHEN** telemetry is disabled
- **THEN** no milestone is sent and no milestone state is written to config

### Requirement: Bounded persisted telemetry state
State the system persists for telemetry SHALL be limited to enum labels, counters, booleans, timestamps, and randomly generated identifiers. A persisted timestamp SHALL NOT be sent; only a bucket derived from it may be. It SHALL NOT include command arguments, item names, paths, hashes of paths, or any other user-authored value.

No telemetry state SHALL be written to disk when telemetry is disabled. This covers the anonymous id, the work session id and its activity time, the milestone set, the first-seen time, the reported tool set, and the previous-outcome record.

The public disclosure SHALL enumerate every field persisted for telemetry and SHALL state where the file lives.

#### Scenario: Opted-out user leaves no trace
- **WHEN** a user has opted out and runs any command
- **THEN** no telemetry field is created or updated in the global config

#### Scenario: Persisted state is enumerable
- **WHEN** a user opens the global config file
- **THEN** every telemetry field it holds is one the disclosure names

### Requirement: Event volume cap
The system SHALL send at most four events per CLI invocation. Where more would be produced, the excess SHALL be dropped rather than queued.

An agent harness can invoke the CLI dozens of times inside one task. An uncapped per-invocation event count turns that into a burst of outbound requests the user never asked for.

#### Scenario: Invocation producing many events
- **WHEN** an invocation would produce more than four events
- **THEN** only the first four are sent
- **AND** the command completes normally

### Requirement: Telemetry never interrupts the user
Telemetry SHALL be silent and non-blocking. It SHALL NOT prompt the user, SHALL NOT ask for input, SHALL NOT block or delay command execution, and SHALL NOT write to stdout.

No telemetry decision SHALL ever be put to the user interactively. Consent is expressed through the documented opt-out mechanisms, which work offline and without a prompt. A CLI that stops to ask about analytics is a CLI that interrupts an agent mid-task.

The one-line first-run disclosure is a notice on stderr, not a prompt: it asks nothing, blocks nothing, and the command proceeds regardless.

Requests SHALL remain fire-and-forget and time-bounded, and a failure SHALL remain silent.

#### Scenario: Telemetry never asks
- **WHEN** any telemetry code path runs
- **THEN** no prompt is displayed and no input is read

#### Scenario: Command is not delayed
- **WHEN** the telemetry endpoint is slow or unreachable
- **THEN** the command runs and exits without waiting beyond the request timeout

#### Scenario: stdout stays clean
- **WHEN** telemetry emits anything at all
- **THEN** it is written to stderr, never stdout

### Requirement: Assistant adoption tracking
The system SHALL send a `tool_configured` event once per configured tool id per anonymous id, carrying only `tool` (an id checked for membership in the `AI_TOOLS` registry), `version`, and `run_id`.

The event SHALL carry no run context. Sending tool identities on every `command_completed` would put the full configured *set* in one row alongside platform, install kind, and counts, which is enough to make an unusual user unique. Emitting one event per tool, decoupled from context, answers how many users have each assistant configured without ever assembling that combination.

The set of tools already reported SHALL be persisted in the telemetry config section, on the same terms as milestones.

#### Scenario: Tool configured
- **WHEN** a user has Cursor configured and no `tool_configured` event has been sent for it
- **THEN** the system sends `tool_configured` with `tool: "cursor"`
- **AND** the event carries no platform, install kind, count, or other run context

#### Scenario: Reported once
- **WHEN** the same user runs another command
- **THEN** no further `tool_configured` event is sent for that tool

#### Scenario: Tool added later
- **WHEN** a user configures an additional tool
- **THEN** a `tool_configured` event is sent for the new tool only

#### Scenario: Unregistered tool id
- **WHEN** a configured tool id is not a member of the `AI_TOOLS` registry
- **THEN** no event is sent for it

### Requirement: Local telemetry inspection
The system SHALL print every event it would send to stderr and send nothing when `OPENSPEC_TELEMETRY_DEBUG` is set to `1`. The printed form SHALL be the exact payload, so a user can verify what is collected without trusting the documentation.

Debug mode SHALL work when telemetry is disabled, printing the payloads that would be sent, prefixed with a line stating telemetry is off and nothing was sent. The person most likely to want to inspect the payloads is the person who has already opted out and is deciding whether to opt back in; hiding the verification path from them defeats its purpose.

Debug mode SHALL NOT generate or persist an anonymous id, or any other telemetry state. Where a payload would carry an id that does not yet exist, the printed form SHALL show a placeholder. Inspecting the telemetry must not create the identifier being inspected.

#### Scenario: Debug mode prints and does not send
- **WHEN** `OPENSPEC_TELEMETRY_DEBUG=1` is set
- **THEN** each event payload is printed to stderr
- **AND** no network request is made

#### Scenario: Debug mode does not pollute stdout
- **WHEN** `OPENSPEC_TELEMETRY_DEBUG=1` is set and a command runs with `--json`
- **THEN** stdout still contains exactly one valid JSON document

#### Scenario: Debug mode for an opted-out user
- **WHEN** `OPENSPEC_TELEMETRY_DEBUG=1` is set and telemetry is disabled
- **THEN** the payloads are printed with a line stating telemetry is off and nothing was sent
- **AND** no network request is made

#### Scenario: Debug mode creates no identity
- **WHEN** `OPENSPEC_TELEMETRY_DEBUG=1` is set on a machine with no anonymous id
- **THEN** the printed payload shows a placeholder id
- **AND** no anonymous id is written to the global config

### Requirement: Data subject controls
The system SHALL expose the telemetry state through `openspec config get telemetry`, showing whether telemetry is enabled, the anonymous id if one exists, and the path to the file holding it.

Deleting the anonymous id from the global config SHALL be sufficient to sever all future events from all prior ones, and the disclosure SHALL say so.

The public disclosure SHALL state the retention period for raw events and SHALL name a contact for a deletion request, stating that a request is made by sending the anonymous id.

The disclosure SHALL describe the data as pseudonymous rather than anonymous. A persistent random identifier combined with device characteristics is pseudonymous personal data; describing it as anonymous overstates the guarantee, and the overstatement is what a reader would hold against every other claim on the page.

The disclosure SHALL state that the anonymous id identifies a configuration directory rather than a person — a shared home directory means one id spans several people, and a fresh container per run means a new id each time — and SHALL NOT present a count of ids as a count of users.

#### Scenario: User inspects telemetry state
- **WHEN** a user runs `openspec config get telemetry`
- **THEN** the output shows the enabled state, the anonymous id, and the config file path

#### Scenario: User severs their history
- **WHEN** a user deletes the anonymous id from the global config
- **THEN** the next event uses a newly generated id unrelated to the previous one

### Requirement: Ingest handling of network-level identifiers
The telemetry ingest proxy SHALL NOT log, store, or forward client IP addresses, and the public disclosure SHALL state this alongside the `$ip: null` claim.

Events are sent to a first-party reverse proxy that terminates TLS, so it observes every client address regardless of the payload. `$ip: null` governs what the analytics backend records, not what our own infrastructure sees, and the current disclosure claims more than the code alone can deliver.

Server-side GeoIP enrichment SHALL be disabled for the telemetry project, so no property is derived from the connecting address.

Event timestamps SHALL be UTC and SHALL carry no local UTC offset, which combined with the rest of the context would locate the user.

#### Scenario: Proxy receives an event
- **WHEN** the ingest proxy receives a telemetry event
- **THEN** it does not record the client address in any log or forwarded payload

#### Scenario: No derived location
- **WHEN** an event is stored
- **THEN** no property derived from the connecting address is attached to it

### Requirement: Public disclosure parity
The public disclosure SHALL enumerate every event, every property, and every persisted field the system uses. A change that adds, removes, or renames any of these SHALL update the disclosure in the same change.

The disclosure lives in `README.md`, `SECURITY.md`, and the environment-variable reference. Each SHALL state the full property list, the opt-out mechanisms, the retention period, and `OPENSPEC_TELEMETRY_DEBUG=1` as the way to verify the list locally.

The property allowlist constant SHALL be the source the disclosure is checked against, and a test SHALL fail when a property exists in the allowlist that is absent from the disclosure documents. An unenforced documentation requirement decays within two releases.

Where a change narrows or removes an existing published privacy commitment, it SHALL record the removal in the changelog under a `Privacy` heading, naming the previous commitment and what replaces it. Editing the commitment without that record SHALL NOT satisfy this requirement.

This change is itself an instance: `SECURITY.md` currently promises "no environment," and `README.md` promises "only command names and version." Adding platform, Node major, and install kind ends both commitments, and that has to be stated rather than quietly edited.

#### Scenario: Disclosure matches the code
- **WHEN** the event property allowlist changes
- **THEN** the disclosure documents are updated in the same change
- **AND** a test fails if any allowlisted property is undocumented

#### Scenario: An existing commitment is narrowed
- **WHEN** a change makes a previously published privacy commitment untrue
- **THEN** the changelog records the previous commitment and what replaces it under a `Privacy` heading

#### Scenario: Disclosure names the verification path
- **WHEN** a user reads the telemetry disclosure
- **THEN** it tells them how to print the events locally rather than asking them to take the list on trust

## MODIFIED Requirements

### Requirement: Privacy-preserving event design
The property allowlist is authoritative; the exclusions below are illustrative of what it already forbids. A blocklist fails on the item nobody thought of, which is why the allowlist exists.

The system SHALL NOT include command arguments, file paths, project names, spec content, error messages, or IP addresses in telemetry events.

The system SHALL additionally exclude: change ids, spec ids, schema ids, artifact ids, store ids, store remotes, store branches, store local paths, `defaultStore`, `featureFlags` keys, `openers` content, environment variable names and values, hostnames, usernames, and git remotes.

Every event name, property key, and property value SHALL satisfy the bounded property contract.

#### Scenario: Command with arguments
- **WHEN** a user runs `openspec init my-project --force`
- **THEN** the telemetry event contains only allowlisted properties and no argument values

#### Scenario: IP address exclusion
- **WHEN** the system sends a telemetry event
- **THEN** the event explicitly sets `$ip: null` to prevent IP tracking

#### Scenario: Named item in a command
- **WHEN** a user runs `openspec archive acme-billing-rewrite`
- **THEN** no event property contains `acme-billing-rewrite`

#### Scenario: Store-backed run
- **WHEN** a command runs against a store whose remote is a private git URL
- **THEN** no event property contains the store id, the remote, or any path

### Requirement: Command execution tracking
The system SHALL send a `command_executed` event to PostHog when any CLI command executes, including the command name, OpenSpec version, surface, `run_id`, and `work_session_id` as properties.

This event is retained despite `command_completed` covering every reachable exit path, because it is the only detector of a run that died so hard the completion hook never ran. If the completion coverage has a gap, only the unmatched pair reveals it — and a systematic blind spot in failure reporting is the exact defect this change exists to remove.

#### Scenario: Standard command execution
- **WHEN** a user runs any openspec command
- **THEN** the system sends a `command_executed` event with `command`, `version`, `surface`, `run_id`, and `work_session_id` properties

#### Scenario: Subcommand execution
- **WHEN** a user runs a nested command like `openspec change apply`
- **THEN** the system sends a `command_executed` event with the full command path (e.g., `change:apply`)

#### Scenario: Unmatched start event
- **WHEN** a `command_executed` event has no matching `command_completed` with the same `run_id`
- **THEN** the gap is attributable to an exit path the completion coverage does not reach

### Requirement: First-run telemetry notice
The system SHALL display a one-line telemetry disclosure notice on the first command execution, before any telemetry is sent. In `--json` mode the system SHALL NOT display the notice on that run and SHALL leave the notice state unset, deferring the disclosure to the first later non-JSON run.

The telemetry config section SHALL record which version of the notice a user has seen. When the disclosed collection scope expands, the system SHALL show a notice naming what changed, once, and record the new notice version.

The system SHALL NOT reset the seen state to re-notify. Resetting discards the knowledge that the user was told, and shows a generic sentence to someone who already read it, which teaches them to ignore it. A versioned notice distinguishes "never told" from "told about an earlier scope," and lets the new message say what actually changed.

The notice SHALL NOT describe the data as anonymous without qualification.

#### Scenario: First command execution
- **WHEN** a user runs their first openspec command without `--json`
- **AND** telemetry is enabled
- **THEN** the system displays the disclosure notice, naming the opt-out

#### Scenario: Subsequent command execution
- **WHEN** a user has already seen the current notice version
- **THEN** the system does not display the notice

#### Scenario: Notice before telemetry
- **WHEN** displaying the first-run notice
- **THEN** the notice appears before any telemetry event is sent

#### Scenario: First command execution in JSON mode
- **WHEN** a user's first openspec command passes `--json`
- **AND** telemetry is enabled
- **THEN** the system displays no notice on stdout
- **AND** the notice state remains unset

#### Scenario: Disclosure deferred, not skipped
- **WHEN** a user's first run was in `--json` mode and displayed no notice
- **AND** the user later runs a command without `--json`
- **THEN** the system displays the disclosure notice on that later run

#### Scenario: Collection scope expands
- **WHEN** the disclosed property list expands in a release
- **AND** a user has seen an earlier notice version
- **THEN** the system displays a notice naming what changed, once
- **AND** records the new notice version
