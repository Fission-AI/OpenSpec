# Schema Openness

## ADDED Requirements

### Requirement: Schemas inherit through references

Schema resolution SHALL consult the stores a root references, in declaration
order, between project-local and user-level schemas. Unreadable config,
registry, or checkouts SHALL degrade to "no inherited schemas", never an
error. `openspec schemas` SHALL label inherited schemas with their store.

#### Scenario: A consumer repo uses the store's workflow
- **GIVEN** a repo whose config declares `references: [product-hub]` and a store defining `schemas/product-brief/`
- **WHEN** the user runs `openspec new change spike --schema product-brief` in the repo
- **THEN** the change is created with the store's schema and its artifact graph gates work as usual

### Requirement: Schema authors can speak to agents

A schema MAY carry top-level `notes:`; every instruction surface SHALL
render it verbatim. Per-artifact guidance MAY live in
`instructions/<artifact-id>.md` beside the schema (and `instructions/apply.md`
for the apply phase); a file SHALL win over an inline `instruction:` value.

#### Scenario: A documentation-only workflow steers the agent
- **GIVEN** a schema whose notes say it has no implementation phase
- **WHEN** any artifact's instructions render
- **THEN** the notes appear in a `<schema_notes>` block before the artifact guidance

### Requirement: A store can declare its layout, and the layout is real

Config MAY carry `structure:` — a map of folders (keys ending `/`) and
files to their purpose. `openspec context` and the references index SHALL
surface it; `openspec store setup <id>` SHALL materialize declared entries
that are missing (seeding markdown files with their purpose, never
overwriting, confined to `openspec/`); `openspec store doctor` SHALL flag
declared entries missing on disk.

#### Scenario: Downstream agents see the store's layout
- **GIVEN** a store whose config declares `structure: { research/: raw inputs }`
- **WHEN** a referencing repo runs `openspec context`
- **THEN** the store's member entry lists `research/` with its purpose

#### Scenario: Declared layout materializes on setup
- **GIVEN** a store whose config declares a folder and a markdown file that do not exist
- **WHEN** `openspec store setup <id>` runs again
- **THEN** the folder exists, the file exists seeded with its purpose, and nothing pre-existing was overwritten
