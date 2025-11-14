## ADDED Requirements

### Requirement: Language Selection

The command SHALL prompt users to select their preferred language during initialization, and all generated content SHALL use the selected language. The default language SHALL be English (en-US), with optional support for Chinese (zh-CN), French (fr-FR), Japanese (ja-JP), Arabic (ar-SA), and other languages as they become available.

#### Scenario: Prompting for language selection in interactive mode

- **WHEN** `openspec init` is executed interactively
- **THEN** present a language selection prompt before AI tool selection
- **AND** display available languages with their native names (e.g., "English (en-US)", "中文 (zh-CN)", "Français (fr-FR)", "日本語 (ja-JP)", "العربية (ar-SA)")
- **AND** default to English (en-US) if no selection is made
- **AND** store the selected language in `openspec/config.json` for future use
- **AND** supported language codes include: `en-US` (default), `zh-CN`, `fr-FR`, `ja-JP`, `ar-SA`

#### Scenario: Language selection in non-interactive mode

- **WHEN** `openspec init` is executed with `--language` option
- **THEN** validate the provided language code against supported languages
- **AND** use the specified language for all generated content
- **AND** store the language setting in `openspec/config.json`
- **AND** exit with code 1 if an invalid language code is provided, displaying available language codes

#### Scenario: Reading existing language configuration

- **GIVEN** `openspec/config.json` exists with a language setting
- **WHEN** `openspec init` is executed in extend mode
- **THEN** read the existing language configuration
- **AND** use the stored language for generating new content
- **AND** allow users to change the language during extend mode if desired

### Requirement: Language Configuration Storage

The command SHALL persist language settings in a configuration file for consistency across commands.

#### Scenario: Creating language configuration file

- **WHEN** language is selected during initialization
- **THEN** create `openspec/config.json` with the language setting
- **AND** store the language code in the format: `{ "language": "en-US" }`
- **AND** ensure the file is created even if only the directory structure is being extended

#### Scenario: Configuration file format

- **WHEN** `openspec/config.json` is created or updated
- **THEN** use valid JSON format
- **AND** include the `language` field with a valid language code
- **AND** preserve any existing configuration fields if the file already exists

### Requirement: Multilingual Template Generation

All generated templates and configuration files SHALL use content in the selected language.

#### Scenario: Generating AGENTS.md in selected language

- **WHEN** initializing OpenSpec with a selected language
- **THEN** generate `openspec/AGENTS.md` with content in the selected language
- **AND** ensure all instructions, examples, and guidance text are translated appropriately

#### Scenario: Generating project.md in selected language

- **WHEN** initializing OpenSpec with a selected language
- **THEN** generate `openspec/project.md` with template content in the selected language
- **AND** ensure all section headers, placeholders, and guidance text are in the selected language

#### Scenario: Generating AI tool configuration files in selected language

- **WHEN** configuring AI tools with a selected language
- **THEN** generate all tool-specific configuration files (e.g., `CLAUDE.md`, `.cursor/commands/*.md`) with content in the selected language
- **AND** ensure stub instructions and managed block content are translated appropriately

#### Scenario: Generating slash command files in selected language

- **WHEN** generating slash command files for selected AI tools
- **THEN** populate all command files with instructions in the selected language
- **AND** ensure workflow descriptions and guidance text match the selected language

## MODIFIED Requirements

### Requirement: File Generation

The command SHALL generate required template files with appropriate content for immediate use in the user's selected language.

#### Scenario: Generating template files

- **WHEN** initializing OpenSpec
- **THEN** generate `openspec/AGENTS.md` containing complete OpenSpec instructions for AI assistants in the selected language
- **AND** generate `project.md` with project context template in the selected language
- **AND** use the language setting from `openspec/config.json` if it exists, otherwise use the language selected during initialization

### Requirement: Directory Creation

The command SHALL create the complete OpenSpec directory structure with all required directories and files, including the configuration file.

#### Scenario: Creating OpenSpec structure

- **WHEN** `openspec init` is executed
- **THEN** create the following directory structure:
```
openspec/
├── project.md
├── AGENTS.md
├── config.json
├── specs/
└── changes/
    └── archive/
```

### Requirement: Non-Interactive Mode

The command SHALL support non-interactive operation through command-line options for automation and CI/CD use cases, including language selection.

#### Scenario: Select all tools non-interactively

- **WHEN** run with `--tools all` and `--language <lang-code>`
- **THEN** automatically select every available AI tool without prompting
- **AND** use the specified language for all generated content
- **AND** proceed with initialization using the selected tools and language

#### Scenario: Select specific tools non-interactively

- **WHEN** run with `--tools claude,cursor` and `--language <lang-code>`
- **THEN** parse the comma-separated tool IDs and validate against available tools
- **AND** use the specified language for all generated content
- **AND** proceed with initialization using only the specified valid tools

#### Scenario: Skip tool configuration non-interactively

- **WHEN** run with `--tools none` and `--language <lang-code>`
- **THEN** skip AI tool configuration entirely
- **AND** use the specified language for generated template files
- **AND** only create the OpenSpec directory structure and template files

#### Scenario: Help text lists available tool IDs and language codes

- **WHEN** displaying CLI help for `openspec init`
- **THEN** show the `--tools` option description with the valid values derived from the AI tool registry
- **AND** show the `--language` option description with supported language codes (e.g., `en-US` (default), `zh-CN`, `fr-FR`, `ja-JP`, `ar-SA`)

