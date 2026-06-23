# Fix Greenfield Archive Sync

## Summary

Clarify the archive workflow so a greenfield change with delta specs creates the corresponding main spec before the change is archived.

## Motivation

Issue #1222 reports that the first archived change in a new project can move into `openspec/changes/archive` without creating `openspec/specs/<capability>/spec.md`. This leaves the project without a source-of-truth spec after its first completed change.

## Scope

- Update generated archive workflow guidance to classify a missing main spec as a sync-needed state.
- Keep existing standalone `openspec archive` behavior unchanged.
