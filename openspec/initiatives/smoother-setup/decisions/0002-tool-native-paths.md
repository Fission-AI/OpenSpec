# ADR 0002: Match each tool's own folder names

## Status

Accepted

## Context

One adapter wrote commands to a folder that did not match the tool's documented
path, while every other adapter used the tool's expected (plural) folder name.
This was inconsistent and confusing.

## Decision

Use the folder each tool expects. Keep the old path working for a while, so
existing setups do not break.

## Trade-offs

- Easier: commands land where the tool actually looks for them.
- Harder: we carry a backward-compatible path until old setups move over.

_Source: the `fix-opencode-commands-directory` change in this repo._
