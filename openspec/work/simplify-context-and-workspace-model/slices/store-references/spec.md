# Store References Spec (3.1)

## Outcome

A project repo can declare, once, which stores its work draws on — and
from then on, every agent session in that repo sees an **index** of those
stores' specs inside the instructions it already reads: what exists, one
line about each, and the exact command to fetch any of them. Upstream
truth stays in the store; downstream work stays in the repo's own root;
the connection is a declaration plus citations, never redirection,
copy-paste, or per-change links.

This is the headline PM/architect-to-dev layering flow: requirements
live in `team-context`, the dev's agent writing a low-level design in
the app repo discovers them from config, fetches what it needs with
`--store`, and cites them.

## Locked Decisions (roadmap, 2026-06-11)

1. **Index, not inline.** Referenced-store content is never inlined into
   generated instructions. Instructions carry an index (spec ids,
   one-line summaries, the fetch recipe via `--store`) built **live from
   the registered checkout at assembly time**; the agent fetches what it
   needs. Inlining would freeze upstream content at generation time —
   the copy-paste failure this effort exists to kill.
2. **Declarations live in `openspec/config.yaml`.** A `references:` list
   of store ids, sharing the one id namespace (kebab grammar) locked for
   Phase 3.
3. **Relationships are location, declaration, or citation — never
   managed artifact links.** No per-change edge objects; artifact-level
   derivation ("derives from team-context/billing") is prose citation.
4. **Root resolution is untouched.** References are read-only context. A
   declared reference never changes where commands act; writing to a
   referenced store remains an explicit `--store` action and a separate
   change in that store. The fixed precedence (explicit `--store` →
   nearest local root → declared fallback (3.2) → error) gains nothing
   from this slice.
5. **An unresolvable reference is reported with a clear next step, not
   silently ignored.**

## Decisions This Spec Makes (autonomous, recorded in the changelog)

1. **The index lives in both instruction surfaces, both modes.**
   Artifact instructions (`openspec instructions <artifact> --change
   ...`) and apply instructions (`openspec instructions apply`) both
   carry it, built by one shared assembler. Artifact human mode prints
   the `<referenced_stores>` XML block (mirroring `<project_context>`);
   apply human mode prints a `### Referenced Stores` markdown section
   matching its existing markdown style (`printApplyInstructionsText`
   is a real human surface — `instructions.ts:429-484`). No other
   command changes.
2. **The summary is the first non-empty line of the spec's Purpose
   section, extracted tolerantly.** NOT via `parseSpec()` — that
   throws on a missing Purpose or Requirements section
   (`src/core/parsers/markdown-parser.ts:80-86`) and the index must
   never fail on an imperfect upstream spec. The assembler scans
   sections directly; a spec with no Purpose, an unreadable file, or
   an unparseable file indexes with an empty summary (rendered as the
   bare `- <id>` line, no dangling colon). No new authoring
   requirement on stores.
3. **Problems degrade to warnings, never to silence or failure.**
   Instructions still generate; a problem entry carries the established
   `severity`/`code`/`message`/`fix` diagnostic shape (severity
   `warning` for all reference codes — JSON consumers must be able to
   distinguish degraded context from errors). New codes:
   - `reference_unresolved` — the id has no registry entry; fix names
     the id concretely: "get a checkout from a teammate and run:
     openspec store register <path> --id <the-referenced-id>" (naming
     a clone source is 3.3's job).
   - `reference_invalid_id` — entry fails the kebab id grammar; fix:
     use kebab-case ids in `references:`. (Deliberately distinct from
     the CLI's hard-error `invalid_store_id`: same grammar, different
     contract — the index degrades where the CLI refuses.)
   - `reference_root_unhealthy` — the registry resolved the id but
     anything after that failed (missing checkout path, missing or
     mismatched store metadata, unhealthy OpenSpec root per
     `inspectOpenSpecRoot().healthy === false`); fix:
     `openspec store doctor <id>`.
   A self-reference (the resolved root IS the referenced store, by
   canonicalized-path equality or matching resolved `store_id`) is
   omitted with no diagnostic — referencing yourself is meaningless; a
   root whose only reference is itself simply gets an empty index.
4. **The declaration is symmetric, and the index is exactly one level
   deep.** The assembler reads the *resolved root's* config — a store's
   own config may carry `references:`, and a session running
   `--store team-context` sees that store's upstream references. But a
   referenced store's own `references:` are never followed: no
   recursion, so circular declarations (A↔B) are structurally
   harmless.
5. **One shared resolution path, async at the command boundary.** The
   assembler must not fork store resolution: it reuses the
   registry-lookup → metadata-check → root-inspection pipeline that
   `resolveStoreRoot` (`src/core/root-selection.ts:134-218`) owns, via
   a non-throwing read-only variant extracted from it — never a
   re-implementation. Because that pipeline is async while
   `generateInstructions` is sync (`instruction-loader.ts:271`), the
   index is assembled by an async core helper invoked from the command
   layer after root resolution, and passed into the (still-sync)
   generators as an input — no async-ification of the instruction
   loader. A registry that cannot be read or parsed at all degrades the
   same way as everything else: each declared reference indexes with a
   `reference_registry_unreadable` warning (fix:
   `openspec store doctor`).
6. **The list is deduplicated, order-preserving, and budgeted like
   context.** A resolved store with zero specs indexes as an entry with
   `specs: []` (the agent learns the store resolved and holds nothing).
   The rendered index shares the spirit of the existing 50KB
   project-context cap (`project-config.ts:45`): if the rendered index
   would exceed 50KB, per-store spec lists are truncated
   (order-preserving) and the entry carries a
   `reference_index_truncated` warning naming the cap — the agent can
   still fetch anything by listing the store directly.
7. **Vocabulary**: the user-facing noun is "referenced store(s)"; the
   JSON field is `references` (matching the config key). No workflow
   template changes in this slice — templates already direct agents to
   read instructions output, and the index is self-describing.
8. **Config parsing keeps raw strings; the assembler validates.**
   `readProjectConfig` accepts `references` as an optional array,
   keeping string-typed entries (deduplicated, order-preserving) and
   dropping only non-strings per the existing resilient style; id
   grammar is the assembler's job so invalid ids surface as index
   diagnostics instead of being silently dropped at parse time.

## User Experience

A PM keeps requirements in the team store. The app repo declares the
relationship once:

```yaml
# app-repo/openspec/config.yaml
schema: spec-driven
references:
  - team-context
```

A dev tells their agent "write the low-level design for billing
invoicing". The agent runs the instructions command it already uses:

```text
$ openspec instructions design --change billing-rework
...
<referenced_stores>
<!-- Read-only upstream context. Fetch what you need; cite what you use. -->
Store team-context (/Users/dev/src/team-context):
  - billing: Billing must support usage-based invoicing across regions
  - auth-sso: Single sign-on requirements for enterprise tenants
  Fetch: openspec show <spec-id> --type spec --store team-context
</referenced_stores>
```

The agent fetches `openspec show billing --type spec --store
team-context`, writes the design in the app repo's own root, and cites
`team-context/billing` in prose. Nothing redirected the change to the
store; nothing copied the requirement into the repo.

When the store is not registered on this machine, the agent (and the
human) see exactly what to do instead of silently missing context:

```text
<referenced_stores>
Store team-context: not registered on this machine.
  Fix: get a checkout from a teammate and run: openspec store register <path> --id team-context
</referenced_stores>
```

## Scope

In scope:

- **Config**: `references:` (optional array of store ids) in
  `ProjectConfigSchema` (`src/core/project-config.ts:19-41`), parsed
  with the existing resilient field-by-field style; invalid entries
  surface through the index diagnostics, valid entries survive.
- **One shared index assembler** (new module under `src/core/`, e.g.
  `references.ts`): resolve each id through the shared non-throwing
  resolution variant (decision 5), enumerate the referenced root's
  `openspec/specs/`, extract first-line summaries tolerantly
  (decision 2), and emit per-store entries
  `{store_id, root, specs: [{id, summary}], fetch, status: [...]}`
  (`root` absolute; `fetch` the per-store recipe string).
- **Artifact instructions**: `generateInstructions`
  (`src/core/artifact-graph/instruction-loader.ts:271-339`) gains a
  `references` field; human mode prints the `<referenced_stores>` block
  in the fixed position after the (conditional) `<project_context>`
  block (`src/commands/workflow/instructions.ts:171-178`) — when
  `context:` is absent, the references block prints in that same slot.
- **Apply instructions**: `generateApplyInstructions`
  (`src/commands/workflow/instructions.ts:282-381`) gains the same
  field; `printApplyInstructionsText` gains a `### Referenced Stores`
  markdown section in its existing style.
- **Diagnostics**: the five new warning codes above
  (`reference_unresolved`, `reference_invalid_id`,
  `reference_root_unhealthy`, `reference_registry_unreadable`,
  `reference_index_truncated`), in the established shape.
- **Tests**: config parsing (valid, dedup, non-string entries dropped,
  raw invalid-grammar strings kept); assembler unit coverage (resolved,
  unresolved, unhealthy incl. missing checkout path, self-reference,
  zero-spec store, missing Purpose, unparseable spec file);
  instructions JSON + human output for both surfaces, including the
  context+references ordering pin and the references-without-context
  placement; an e2e test of the layered flow — app repo with a
  reference, registered store with a spec, `instructions` output
  carries the index, and the printed fetch command runs verbatim
  against the built binary.
- **Docs**: a "Referencing stores from a project" subsection in
  `docs/cli.md`'s Stores section documenting the `references:` config
  key (no such config-key reference exists today — this subsection is
  created, not extended).

Out of scope:

- The fallback `store:` pointer for rootless repos (3.2).
- Canonical remotes in store identity and clone-source hints (3.3).
- Later relationship health in doctor (3.6) — instructions-inline diagnostics
  are this slice's only health surface.
- Any change to root resolution, the `--store` flag, or write paths.
- Inlining spec content, caching the index, or citation enforcement.
- `context:` field changes; docs rewrites beyond `docs/cli.md`'s
  config-reference section gaining the `references:` key.

## Acceptance Criteria

### The Declaration

#### Scenario: References Parse Resiliently

- **GIVEN** `openspec/config.yaml` with `references: [team-context,
  team-context, BAD ID, other-context, 7]`
- **WHEN** the config is read
- **THEN** the parsed references are `[team-context, BAD ID,
  other-context]` (deduplicated, order-preserving, string entries only
  — grammar validation is the assembler's job, decision 8)
- **AND** the index output carries a `reference_invalid_id` warning
  naming `BAD ID` with the kebab-grammar fix
- **AND** a config with no `references:` key behaves exactly as today

### The Index

#### Scenario: Instructions Carry The Live Index

- **GIVEN** an app repo whose config references a registered store
  containing specs `billing` and `auth-sso`
- **WHEN** `openspec instructions <artifact> --change <id> --json` runs
  in the app repo
- **THEN** the JSON carries `references: [{store_id: "team-context",
  root: <absolute path>, specs: [{id, summary}, ...], fetch: "openspec
  show <spec-id> --type spec --store team-context"}]`
- **AND** the summaries are the first non-empty Purpose lines, read from
  the store checkout at this moment (editing the store and re-running
  instructions changes the summary — nothing is frozen)
- **AND** spec content is NOT inlined anywhere in the output
- **AND** human mode prints the `<referenced_stores>` block with the
  same information
- **AND** `instructions apply --change <id> --json` carries the same
  `references` field

#### Scenario: The Fetch Recipe Works Verbatim

- **WHEN** the agent runs the printed fetch command with a real spec id
- **THEN** it returns that spec from the store, read-only, while the
  session's own commands keep acting on the app repo's root

#### Scenario: Problems Are Reported, Never Silent

- **GIVEN** a reference to an id absent from the local registry
- **WHEN** instructions run
- **THEN** generation succeeds, and the index entry carries
  `reference_unresolved` (severity `warning`) with a fix naming the
  referenced id: `openspec store register <path> --id <id>`
- **AND** a registered referenced root that is unhealthy — or whose
  checkout path no longer exists on disk — yields
  `reference_root_unhealthy` with the `openspec store doctor <id>` fix
- **AND** when the resolved root IS the referenced store (self
  reference), the entry is omitted with no diagnostic
- **AND** a referenced store's own `references:` are never followed
  (one level deep; A↔B circular declarations cause no recursion)

### The Boundaries Hold

#### Scenario: References Never Move The Root

- **GIVEN** the app repo declares `references: [team-context]`
- **WHEN** `new change`, `status`, `validate`, or `archive` run without
  `--store`
- **THEN** they act on the app repo's own root, byte-identical to a repo
  with no references
- **AND** no command writes anything into the referenced store
- **AND** no per-change link metadata is created anywhere

#### Scenario: Symmetric Declarations

- **GIVEN** a store whose own config carries `references:
  [upstream-context]`
- **WHEN** `instructions ... --store team-context --json` runs
- **THEN** the index reflects `team-context`'s references (resolved
  root's config, not the cwd's)

### The Layered Flow End To End

#### Scenario: PM-To-Dev Journey

- **GIVEN** a registered store with a `billing` spec carrying a Purpose
  section, and an app repo with its own root and a `references`
  declaration
- **WHEN** the e2e test drives: `instructions design --change
  billing-rework --json` in the app repo → reads the index → runs the
  fetch command → writes a design artifact in the app repo citing
  `team-context/billing` → `validate` and `status`
- **THEN** every step succeeds against the built binary
- **AND** the design lands in the app repo's `openspec/changes/`, the
  store is untouched, and the citation is plain prose in the artifact
