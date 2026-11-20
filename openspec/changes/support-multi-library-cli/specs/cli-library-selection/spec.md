# Spec Delta

## Purpose

Let users operate on product-specific OpenSpec libraries from a shared repository directory while keeping each item and write associated with its owning library.

## ADDED Requirements

### Requirement: Local library scope
The CLI SHALL discover the selected local root and valid descendant libraries for library-aware commands. Without a local root it SHALL discover below the current directory. Discovery SHALL preserve legacy layouts, excluded directories, symlink boundaries, and physical-root deduplication established for recursive listing.

#### Scenario: Product-local scope
- **WHEN** a command runs inside a product with its own OpenSpec root
- **THEN** its discovery scope includes that product and its descendants
- **AND** sibling product libraries remain outside the scope

#### Scenario: Parent without a root
- **WHEN** a command runs above valid descendant libraries without a local root
- **THEN** those libraries are available before any machine-level default store fallback

#### Scenario: Excluded paths
- **WHEN** dependencies, caches, builds, worktrees, virtual environments, planning contents, or directory symlinks contain apparent libraries
- **THEN** discovery omits those paths and lists each remaining physical library once

### Requirement: Explicit library selection
Library-aware commands SHALL accept an optional --library project-path selector that selects exactly one discovered local library. Relative paths SHALL resolve from the command's original working directory. Store and library selectors SHALL be mutually exclusive. Existing init/update positional project paths SHALL remain valid explicit targets.

#### Scenario: Select a descendant
- **WHEN** a user runs show, validate, status, archive, or another library-aware command with --library batch-worker
- **THEN** the command targets only that discovered project's library
- **AND** command hints retain the selection

#### Scenario: Invalid selection
- **WHEN** the selected path is outside the discovered scope, is excluded, or is a directory symlink
- **THEN** report an actionable selection error before reading an item or writing files

#### Scenario: Conflicting selectors
- **WHEN** --store and --library are supplied together or --library conflicts with a positional project path
- **THEN** report the conflict before executing the command

### Requirement: Owning library lookup
Commands naming an existing change, spec, or local schema SHALL resolve the item within the discovered scope. Exactly one matching library SHALL select that owner. Multiple matches SHALL produce a library ambiguity error containing relative paths and explicit-selection examples. Existing change-versus-spec type ambiguity SHALL remain separately actionable.

#### Scenario: Unique descendant item
- **WHEN** a named item exists only in a descendant library
- **THEN** operate on that item using its library's configuration, schemas, specs, and paths

#### Scenario: Duplicate names
- **WHEN** the same item name exists in the root and a descendant or two descendants
- **THEN** list every candidate library and require selection before executing the item command

#### Scenario: Nested spec identifier
- **WHEN** a spec identifier contains path separators such as platform/session
- **THEN** preserve it as a spec identifier and use --library to disambiguate its owner

### Requirement: Store scope
Commands selecting a registered store explicitly or through a project pointer SHALL keep that store's existing scope. A default store SHALL remain a fallback when no local library resolves. Local discovery SHALL preserve the provenance of store-selected roots.

#### Scenario: Explicit store
- **WHEN** --store selects a store while unrelated local libraries exist
- **THEN** browse, validate, inspect, and modify only the selected store

#### Scenario: Project store pointer
- **WHEN** a config-only project declares a store
- **THEN** resolve that store through the existing store identity and health checks
- **AND** unrelated descendant projects remain outside the selection

### Requirement: Single-library writes
Commands that create, update, archive, initialize, or otherwise write library-specific files SHALL resolve one target before making changes. Existing named items SHALL use their unique owning library. Apart from initialization's existing cwd setup behavior, new items and root-level writes SHALL use an explicit target or the nearest selected local root; without either, one discovered library SHALL be selected and multiple libraries SHALL produce a target-selection error.

#### Scenario: Archive ownership
- **WHEN** a unique descendant change is archived from the repository root
- **THEN** update specs and archive the change inside its owning library only
- **AND** retain existing task checks, prompts, and archive options

#### Scenario: New change with local root
- **WHEN** a new change is created from a repository with its own selected root and descendants
- **THEN** create it in the selected root unless --library chooses another project

#### Scenario: Targetless write above several libraries
- **WHEN** a creation or root-level write has several possible libraries and no nearest or explicit target
- **THEN** print candidate project paths and selection examples before writing any file

#### Scenario: Default initialization
- **WHEN** init runs without a positional project path or --library
- **THEN** retain its existing cwd initialization behavior for one project

#### Scenario: Explicit initialization
- **WHEN** init receives an explicit project path that does not yet have an OpenSpec library
- **THEN** initialize exactly that project using existing initialization behavior

### Requirement: Library-aware health and context
Doctor and context SHALL report discovered local libraries with owning-library metadata. Schema and template inventories SHALL keep library-specific definitions separately labeled. A single-root response SHALL keep its existing shape; aggregated JSON SHALL retain command payload arrays and add library and roots metadata.

#### Scenario: Multiple local contexts
- **WHEN** context runs in a split-library repository
- **THEN** include each local library's working set with its ownership and reference provenance
- **AND** preserve distinct items and diagnostics when names repeat

#### Scenario: Health and schema inventories
- **WHEN** doctor, schemas, or templates runs across several local libraries
- **THEN** label each library's health or definitions without merging same-named local schemas

### Requirement: Partial failures and clean JSON
Read-only aggregate commands SHALL retain successful library results and report one actionable diagnostic per unreadable or malformed library. Failures SHALL produce a nonzero exit status. JSON SHALL contain no banners, colors, or presentation text, and single-library payloads SHALL preserve their existing shape.

#### Scenario: One failing library
- **WHEN** one library cannot be read during a combined dashboard, context, doctor, or bulk validation
- **THEN** show successful libraries and identify the failing relative library path with a suggested fix

#### Scenario: Failed mutation lookup
- **WHEN** an unreadable candidate library prevents establishing a unique mutation target
- **THEN** report incomplete selection and write nothing

### Requirement: Cross-platform library paths
Library selection SHALL support native platform paths and canonical physical identity on macOS, Linux, and Windows. Human labels and JSON library identifiers SHALL consistently use relative forward-slash labels, while filesystem operations and absolute root paths SHALL follow platform conventions.

#### Scenario: Windows selection
- **WHEN** a Windows user selects a discovered project using native backslash separators
- **THEN** resolve the same owning library as its normalized label and preserve the selected root in follow-up commands

#### Scenario: Path aliases
- **WHEN** two path spellings identify the same permitted physical library
- **THEN** report that library once and use canonical identity for ambiguity checks
