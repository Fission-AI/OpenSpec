# Add safe parent references for monorepos

## Why

Monorepo packages can keep independent OpenSpec roots, but they cannot reuse the
shared specs, context, or schemas at the repository root without registering a
Store. That makes co-located planning either disconnected or centralized away
from the package it describes (#1729).

## What Changes

- Allow `references: [{ path: ../.. }]` to name a parent OpenSpec root.
- Surface the parent's specs as read-only instruction context.
- Inherit parent context and schemas while keeping child values higher priority.
- Keep every write, merge, and archive operation scoped to the nearest root.

Local references are one hop and must resolve to a strict ancestor. They do not
discover sibling packages, change root selection, or permit cross-root writes.

## Impact

- Affected specs: `monorepo-references` (new)
- Affected code: project config, reference indexing, schema resolution, context,
  doctor, and workflow instructions
- Affected docs: CLI references and project customization
