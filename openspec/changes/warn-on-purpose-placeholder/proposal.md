## Why

When a delta introduces a capability without a usable `## Purpose`, archive writes
`TBD - created by archiving change <name>. Update Purpose after archive.` into the
new main spec. Three places already tell authors to replace it — the `specs`
instruction ("including a leftover `TBD` placeholder — edit the main spec
directly"), the sync-specs summary step ("so it gets written now rather than
lingering"), and the archive contract itself — but nothing reports that it is
still there.

`--strict` cannot reach it. The check meant to catch a Purpose nobody wrote is a
50-character floor, and the placeholder is 91 characters, so the one rule that
exists to catch a thin Purpose is satisfied by the exact text meaning "nobody
wrote one". A spec whose Purpose reads `Does stuff.` fails `--strict` today; a
spec whose Purpose says nothing at all passes.

The result is a capability that carries a to-do indefinitely while every command
reports success, and a silent pass is indistinguishable from a clean run.
[#369](https://github.com/Fission-AI/OpenSpec/issues/369) reported agents leaving
the placeholder behind and stayed open for seven months; the remedies since have
been instructions, which is the mechanism that report described as unreliable.

## What Changes

- `openspec validate` reports a `## Purpose` that is still the archive
  placeholder, as a warning on the spec's Purpose, naming the line to replace.
- The message says to edit the main spec directly, because a `## Purpose` in a
  delta is read only when a capability is created and cannot replace an existing
  one.
- Detection stays narrow: the sentence archive itself writes counts wherever it
  appears in the Purpose, and otherwise only a `TBD` opening the Purpose counts.
  A `TBD` inside a sentence is authored prose and is left alone.
- A Purpose reported as a placeholder is no longer also reported as too brief, so
  a bare `TBD` yields one finding rather than two.
- Not breaking: the finding is a warning, so a project that already carries
  placeholders keeps validating by default and only `--strict` fails. `openspec
  archive` is unaffected — it validates rebuilt specs without `--strict`, so a
  spec archive writes still passes the validation it would have passed before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-validate`: adds a requirement that spec validation report a Purpose left as
  the archive placeholder, with the severity, detection boundary, and precedence
  over the existing brevity warning stated as contract.

## Impact

- **Affected behavior**: `openspec validate` on main specs — `validate <spec>`,
  `validate --specs`, and the bulk/interactive paths that share it. A project
  carrying a placeholder sees a new warning; under `--strict` that project now
  fails until the Purpose is written.
- **Unaffected**: `openspec archive`, which validates rebuilt specs non-strictly;
  delta spec validation, which does not read a main spec's Purpose; and any spec
  whose Purpose is authored prose.
- **Docs**: none required — the message carries its own remediation, and the
  `specs` instruction already tells authors to edit the main spec directly.
