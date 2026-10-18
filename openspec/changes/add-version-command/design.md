# Design: a read-only `openspec version` command

## Context

`openspec --version` is Commander's built-in version flag and intentionally prints only the package version. `src/core/version-check.ts` already knows how to locate the running package, classify several install layouts, select package-manager-specific update advice, enforce update-check privacy controls, and query a registry defensively. Those helpers currently serve `openspec update`, where a nullable return value is enough: either announce a newer release or continue silently.

The new command has a different contract. It must explain why no update was reported, and external tools need a stable JSON shape rather than terminal prose. That requires an additive command and a structured result from the existing version-check core; it does not require a second detection or networking implementation.

## Goals / Non-Goals

**Goals**

- Give people and tools one supported way to inspect the running version and install context.
- Keep the default command local and instant; network access requires `--check`.
- Return one stable JSON document suitable for editor extensions, GUIs, and scripts.
- Reuse the existing install-detection and registry-safety rules.
- Preserve `openspec --version` byte-for-byte for existing scripts.

**Non-Goals**

- Installing or upgrading OpenSpec; that work is tracked separately in #1989.
- Release notes, channels, prerelease selection, or background checks.
- Perfectly identifying every custom package-manager layout. Unknown values remain honest `null`s.
- Changing `openspec update` or its interactive upgrade offer.

## Decisions

### 1. Add a command; do not extend `--version`

`openspec --version` is a widely scripted, root-level flag whose bare output is useful precisely because it has no other fields. Commander also treats root flags differently from subcommands. A separate `openspec version` command creates room for options and structured output without changing the old contract.

### 2. Separate local inspection from the network check

`openspec version` and `openspec version --json` inspect only local process and package paths. `--check` is the sole trigger for registry access. This makes the default deterministic, fast, and safe in offline or air-gapped environments.

The command remains successful when checking is disabled or unavailable. Update availability is advisory, so disabled privacy settings and network failure are data states rather than command failures.

### 3. Use one versioned JSON envelope

The JSON response always starts with the same base fields:

```json
{
  "schemaVersion": 1,
  "version": "1.13.2",
  "install": {
    "location": "/path/to/@fission-ai/openspec",
    "packageManager": "npm",
    "scope": "global"
  }
}
```

With `--check`, the response adds:

```json
{
  "update": {
    "status": "available",
    "latest": "1.14.0",
    "command": "npm install -g @fission-ai/openspec@latest",
    "canSelfUpgrade": true
  }
}
```

`schemaVersion` versions the document independently of the OpenSpec package. The `update` object is absent unless requested, so local callers do not need to distinguish "not checked" from a check outcome. Nullable fields are explicit when detection has no defensible answer.

Status values are deliberately small:

- `available`: a safe newer registry version was found.
- `current`: the check completed and found no newer version.
- `disabled`: policy prevented a request, including privacy opt-outs or a rejected registry.
- `offline`: a permitted request did not produce a usable answer, including timeouts and invalid responses.

### 4. Classify ownership before naming a package manager

Install scope is determined before package-manager ownership:

1. A source checkout reports `scope: "source"` and `packageManager: null`.
2. An ephemeral runner/cache reports `scope: "temporary"`.
3. A dependency owned by the current project reports `scope: "project"`.
4. A recognized global layout reports `scope: "global"`.
5. If no classification is defensible, the field is `null` rather than guessing.

The implementation should reuse `getInstallDir()`, `isSourceCheckout()`, `isEphemeralRunnerInstall()`, `isProjectLocalInstall()`, and `detectPackageManager()`, while adding one pure function that assembles the public install record. Detection stays separately unit-testable with POSIX and Windows paths.

### 5. Return a structured check result from the existing core

`getAvailableCliUpdate()` currently collapses four conditions into `null`: current, disabled, unreachable, and invalid response. Keep it as a compatibility wrapper for `openspec update`, but implement it over a new structured check function whose result maps directly to the four public statuses.

The structured function must share the current request implementation. It must not duplicate registry selection, TLS-only configured-registry behavior, redirect limits, timeouts, response-size limits, or safe-version validation.

### 6. Derive update guidance from existing decisions

The reported command and `canSelfUpgrade` value come from the same install classification used by `openspec update`. Refactor terminal-line builders only as needed to expose a pure structured recommendation; do not parse human-readable strings back into JSON.

`canSelfUpgrade` describes whether the existing safe self-upgrade mechanism could operate on this install. The version command never invokes that mechanism.

### 7. Keep incidental output away from JSON

The CLI already defers telemetry and completion notices for JSON runs. The command follows existing JSON error/output conventions and writes exactly one JSON document to stdout. Human-readable output may use multiple lines but remains uncolored when global color is disabled.

## Security and Privacy

- No network access occurs without `--check`.
- Existing privacy opt-outs continue to block the request.
- A rejected configured registry does not cause a fallback request to public npm.
- Registry-provided versions pass the current strict validator before display.
- Existing redirect, timeout, and response-size limits remain in force.
- Install paths are printed only in direct response to the user's command and are never sent as telemetry by this change.
- The command never executes the reported update command.

## Documentation

The implementation updates `docs-lab/reference/cli.md`, using the current docs-lab page structure and examples. It does not update the legacy `docs/cli.md` page.

## Risks / Trade-offs

- **Public schema commitment:** integrations may depend on field names and status values. `schemaVersion` and regression fixtures make future incompatible changes explicit.
- **Install detection is heuristic:** custom layouts may remain unknown. Returning `null` is less convenient but safer than incorrect update guidance.
- **Absolute path disclosure:** `install.location` can contain a user name. It appears only on explicit local invocation; callers that persist or transmit it are responsible for handling it as local environment data.
- **Status vocabulary:** `offline` also covers unusable registry responses, not only literal network loss. It is intentionally user-facing shorthand for "no usable remote answer" while logs/tests retain the detailed cause internally if needed.

## Migration Plan

This change is additive. Existing flags and commands retain their behavior. No stored data, configuration, or generated files require migration.

## Open Questions

None required for implementation. Review may rename a JSON field or status before approval; after release, incompatible changes require a new `schemaVersion`.
