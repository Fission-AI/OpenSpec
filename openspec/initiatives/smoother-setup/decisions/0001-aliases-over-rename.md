# ADR 0001: Add a schema alias instead of renaming

> An ADR (Architecture Decision Record) captures one decision and why it was
> made, so the reason is not lost later.

## Status

Accepted

## Context

We want `spec-driven` to be called `openspec-default`, which is a clearer name.
But many projects already have `schema: spec-driven` in their config. A direct
rename would break them.

## Decision

Add alias support, so both names point to the same schema. No project breaks,
and the new name can roll out over time.

## Trade-offs

- Easier: a smooth rename with nothing breaking.
- Harder: two names mean a little more to explain until the old one is retired.

_Source: the `schema-alias-support` change in this repo._
