# Stores

> The files behind multi-repo stores: registry.yaml and store.yaml, and which root a command uses.

<!-- Skeleton: headings only. Beta, like the multi-repo group. Machine-maintained
rather than hand-edited; documented so readers can inspect and repair them. The
concept and workflow live in multi-repo/stores.md. Root resolution is the
contract from src/core/root-selection.ts: --store flag, else nearest ancestor
openspec/, else a config-only openspec/'s store: pointer, else the global
defaultStore, else error. This page owns the whole ladder including the
everyday case (nearest openspec/ wins); the section's Overview only links
here. Locations (store/foundation.ts): registry.yaml at <dataDir>/stores/
(~/.local/share/openspec/stores/); store.yaml at .openspec-store/store.yaml
inside each checkout. The glossary's "OpenSpec root" row links here. -->

## registry.yaml

## store.yaml

## Locations

## Root resolution
