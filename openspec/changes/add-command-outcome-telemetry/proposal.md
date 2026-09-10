# Record command outcomes in anonymous telemetry

## Why

Telemetry today fires once, in the `preAction` hook, carrying `command`,
`version`, and `surface` (`src/telemetry/index.ts`, `trackCommand`). It can
answer "how often is `archive` run" and nothing else.

It cannot answer any question we act on:

- Did the command **succeed**? Nothing is recorded after the action runs.
- If it failed, **how**? Every command catches its own error, prints
  `Error: <message>`, and sets `process.exitCode = 1`. The class of failure
  never leaves the process.
- Was the caller a **person or an agent**? Both look identical.
- Do users get from `init` to a first archived change? Unknown.

Worse, failures are the *least* visible runs. Seventeen call sites in
`src/cli/index.ts` end with `process.exit(1)`, which skips commander's
`postAction` hook — the trap the code already documents at
`src/cli/index.ts:317` and `:468`. Commander's own usage errors — unknown
command, unknown flag, a group run with no subcommand — exit before `preAction`
runs, so they produce no event at all. And commander chains hooks without a
`catch`, so an error escaping a command's own handling skips the hook too.

So the runs we most need to see are the ones most likely to vanish: the user
who typed the wrong command, and our own bugs.

The feedback loop is closed only in the good case. Users hitting a confusing
failure do not run `openspec feedback` and do not open an issue; they stop using
the tool. We ship fixes for the problems that get reported, not the problems
that happen.

This change closes that loop without collecting anything about *what* a user is
working on.

## What Changes

**One new event, `command_completed`**, emitted on every exit path that reaches
our own error handling, carrying the outcome, a bounded error class, a bucketed
exit code, and a bucketed duration.

**A hard property contract.** Every event name, property key, and property value
must be a member of a compile-time list, a boolean, or a bucket label — and the
allowlist is enforced at send time, not just asserted in a test. This is the
structural reason the new data cannot describe what someone is working on: there
is no field it could travel in, and an unrecognized field is dropped before the
payload is serialized.

**Bounded run context**: platform, Node major, install kind, invoker, TTY and
JSON flags, profile, delivery, a *count* of configured tools, where the schema
came from, and a bucketed change count.

Deliberately excluded, each for a stated reason: schema, artifact, change, spec,
and store names, because they are user-authored text; store remotes and paths,
because they identify an organization; and **raw millisecond durations**, because
they profile the machine and, at an interactive prompt, record human response
times.

**Which assistant people use, without the fingerprint.** Tool identity ships as a
separate `tool_configured` event — once per tool per user, carrying no run
context at all. That answers how much of the userbase runs Cursor or Claude Code
while never assembling the configured *set* alongside platform, install kind, and
counts in one row, which is the combination that would single out an unusual
user. The `invoker` enum complements it by recording which agent is actually
driving a given run.

**Telemetry never interrupts.** No prompts, ever. It does not block the command,
does not delay exit beyond the existing 1-second timeout, and never writes to
stdout. The one-line first-run disclosure is a notice on stderr, not a question.

**Outcome coverage** for all three families of exit that skip the hooks today,
including commander's own usage errors — which are invisible now and are exactly
the "user typed the wrong thing" signal.

**Retry visibility.** Whether a user recovers from a failure is the most
actionable signal we can have, and it is not otherwise computable. Two bounded
properties carry it: the previous run's outcome, and whether it was the same
command.

**Correlation at two scales:** a per-invocation `run_id` whose real job is to
reveal exit paths this spec failed to cover, and a `work_session_id` with a
30-minute window, because a CLI work session is many invocations and command
sequences are not computable without it.

**Five milestone events** — `install`, `init`, `propose`, `apply`, `archive` —
giving the activation funnel a real denominator.

**`OPENSPEC_TELEMETRY_DEBUG=1`** prints every event that would be sent and sends
nothing. It works when telemetry is *disabled*, since the person most likely to
want it is someone who opted out and is deciding whether to opt back in, and it
never creates the anonymous id it is being used to inspect.

**Data subject controls**: `openspec config get telemetry` shows the state, the
id, and the file holding it; deleting the id severs all future events from all
prior ones; the disclosure carries a retention period and a deletion contact.

**Honest disclosure.** `SECURITY.md` promises "no environment" and `README.md`
promises "only command names and version." This change ends both. The spec
requires the changelog to say so under a `Privacy` heading rather than quietly
editing the promise, requires a test that fails when an allowlisted property is
undocumented, and requires the docs to stop calling the data "anonymous"
unqualified — a persistent id plus device characteristics is pseudonymous, and
overstating it is what would undermine every other claim on the page.

Two smaller corrections the review surfaced: cancellation must never delay exit
to flush telemetry (Ctrl-C should stop the process, not phone home), and the
ingest proxy must not log client IPs — it terminates TLS, so `$ip: null`
governs what the backend records, not what our own infrastructure sees.

Telemetry stays opt-out and unchanged otherwise: same `OPENSPEC_TELEMETRY=0`,
`DO_NOT_TRACK=1`, `openspec config set telemetry.enabled false`, same automatic
off-in-CI, same silent failure, same 1-second timeout. Users who have seen the
old notice get a one-line notice naming what changed, once.

## Impact

- Affected specs: `telemetry` (ADDED: 15 requirements; MODIFIED: 3)
- Affected code: `src/telemetry/`, `src/cli/index.ts`, `src/commands/shared-output.ts`, `src/commands/config.ts`
- Affected docs: `README.md`, `SECURITY.md`, `CHANGELOG.md`, `docs-lab/reference/configuration/environment-variables.md`
- Affected infrastructure: the `edge.openspec.dev` ingest proxy (IP logging, GeoIP)
- Command behavior, output, and exit codes are unchanged for every user.
