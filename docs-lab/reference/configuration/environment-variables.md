# Environment variables

> Every environment variable OpenSpec reads.

<!-- Skeleton: headings only. This page is the telemetry opt-out's home
(README TODO): OPENSPEC_TELEMETRY=0, DO_NOT_TRACK=1, auto-disabled in CI, plus
what's collected. start/installation.md's Deno section links here to explain
its network-permission flag. XDG vars move the config/data directories. -->

## OPENSPEC_TELEMETRY

## DO_NOT_TRACK

## XDG_CONFIG_HOME and XDG_DATA_HOME

## OPENSPEC_SKILLS_SCOPE

Set to `global` or `project` to choose where `openspec init` installs skills for a new repo. An explicit `--scope` takes precedence. Existing repo skills stay in place.

For a CI job that needs agent skills in its checkout:

```bash
OPENSPEC_SKILLS_SCOPE=project openspec init --tools claude
```

A validation-only job can run `openspec validate --all` directly.
