# Environment variables

> Every environment variable OpenSpec reads.

<!-- Skeleton: headings only. This page is the telemetry opt-out's home
(README TODO): OPENSPEC_TELEMETRY=0, DO_NOT_TRACK=1, auto-disabled in CI, plus
what's collected. start/installation.md's Deno section links here to explain
its network-permission flag. XDG vars move the config/data directories. -->

## OPENSPEC_TELEMETRY

Set to `0` to disable usage telemetry. Telemetry is on by default (opt-out) and
off automatically when `CI` is set to anything but an explicit off-value.

## OPENSPEC_TELEMETRY_DEBUG

Set to `1` to print every telemetry event to stderr and send nothing. Works
while opted out, and does not create the anonymous id it shows you. This is the
way to verify what is collected without taking the documentation on trust.

## DO_NOT_TRACK

## XDG_CONFIG_HOME and XDG_DATA_HOME
