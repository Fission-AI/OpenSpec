# Record command outcomes in anonymous telemetry

## Why

Telemetry today fires once, in the `preAction` hook, carrying `command`,
`version`, and `surface` (`src/telemetry/index.ts`, `trackCommand`). It can
answer "how often is `archive` run" and nothing else.

It cannot answer any question we actually act on:

- Did the command **succeed**? Nothing is recorded after the action runs.
- If it failed, **how**? Every command catches its own error, prints
  `Error: <message>`, and sets `process.exitCode = 1`. The class of failure
  never leaves the process.
- Was the caller a **person or an agent**? Both look identical.
- How long did it take? Unknown.
- Do users get from `init` to a first archived change? Unknown.

Worse, failures are the *least* visible runs. Seventeen call sites in
`src/cli/index.ts` end with `process.exit(1)`, which skips commander's
`postAction` hook entirely — the same trap the code already documents for the
telemetry flush at `src/cli/index.ts:317` and `:468`. So the runs we most need
to see are the ones most likely to vanish.

The result is a closed feedback loop only in the good case. Users hitting a
confusing failure do not run `openspec feedback` and do not open an issue; they
stop using the tool. We ship fixes for the problems that get reported, not the
problems that happen.

This change closes that loop without collecting anything about *what* a user is
working on.

## What Changes

**One new event, `command_completed`**, emitted after every command whether it
succeeded or not, carrying the outcome (`success` / `user_error` /
`internal_error` / `cancelled`), a bounded `error_class`, the exit code, and
duration in milliseconds.

**A hard property contract.** Every telemetry property must have a *fixed,
enumerable value set* — an enum from a compile-time constant, a boolean, a
bucketed count, or a bounded number. No property may carry a value derived from
user-authored text. This is the structural reason the new data cannot describe
what someone is working on: there is no field it could travel in.

**Bounded run context** on `command_completed`: platform, Node major, whether
stdout was a TTY, whether `--json` was passed, install kind, profile, delivery,
configured tool ids (checked for membership in the `AI_TOOLS` registry), where
the active schema came from (`package` / `project` / `user`), and bucketed counts
of changes and specs.

Deliberately *not* sent, because each is user-authored free text: schema ids and
artifact ids (a schema is a directory the user names — `openspec schema fork`
makes that a normal workflow), store ids, store remotes, store paths, change
ids, spec ids, and `featureFlags` keys.

**Outcome coverage.** Three families of exit skip the hook today and all three
get closed: the `process.exit()` call sites (converted to set `process.exitCode`
and return), commander's own usage errors (unknown command, unknown flag, a group
run with no subcommand — these exit *before* `preAction`, so they are invisible
today, and they are exactly the "user typed the wrong thing" signal we want most),
and errors that escape a command's own handler.

**Four milestone events** derived from the existing `anonymousId`: first
successful `init`, `propose`, `apply`, and `archive`. These give the activation
funnel and, read backwards, the drop-off map.

**A session id** correlating the events of a single invocation.

**`OPENSPEC_TELEMETRY_DEBUG=1`** prints every event that would be sent to stderr
and sends nothing. Anyone can verify the claims above on their own machine
rather than taking our word for it.

**Disclosure parity.** `README.md`, `SECURITY.md`, and the environment-variable
reference currently promise "only command names and version" and "no
environment". That stops being true here, so the spec requires the public
disclosure to enumerate the actual property list, and requires it to be updated
in the same change that adds a property.

Telemetry stays opt-out and unchanged in every other respect: same
`OPENSPEC_TELEMETRY=0`, `DO_NOT_TRACK=1`, `openspec config set telemetry.enabled
false`, same automatic off-in-CI, same `$ip: null`, same silent failure, same
1-second timeout.

## Impact

- Affected specs: `telemetry` (ADDED: 8 requirements; MODIFIED: 2)
- Affected code: `src/telemetry/`, `src/cli/index.ts`, `src/commands/shared-output.ts`
- Affected docs: `README.md`, `SECURITY.md`, `docs-lab/reference/configuration/environment-variables.md`
- No change to command behavior, output, or exit codes for any user.
