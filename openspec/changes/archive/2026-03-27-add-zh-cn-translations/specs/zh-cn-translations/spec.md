## ADDED Requirements

### Requirement: Chinese translation completeness
All English documentation files SHALL have corresponding Chinese translations under `docs/i18n/zh-cn/`.

#### Scenario: All source files have translations
- **WHEN** checking `docs/i18n/zh-cn/` against `docs/` and root `README.md`
- **THEN** every source file has a matching translation file with the same filename

### Requirement: Technical content preservation
Translations SHALL preserve command names, code, links, and technical proper nouns in their original form.

#### Scenario: Command names remain in English
- **WHEN** translating a document containing CLI commands like `openspec init` or `/opsx:propose`
- **THEN** the command text remains unchanged in the Chinese translation

#### Scenario: Code blocks remain unchanged
- **WHEN** translating a document containing code blocks or inline code
- **THEN** all code content is preserved exactly as in the source

#### Scenario: Links remain functional
- **WHEN** translating a document containing hyperlinks or relative paths
- **THEN** link targets are preserved or adjusted to point to the correct Chinese translation paths

### Requirement: Internal links point to Chinese translations
Internal document links in Chinese translations SHALL point to other Chinese translation files, not to English source files.

#### Scenario: Cross-document links use Chinese paths
- **WHEN** translating a document that links to another documentation file (e.g., `[Commands](../commands.md)`)
- **THEN** the link target is rewritten to point to the corresponding file under `docs/i18n/zh-cn/`

#### Scenario: External links remain unchanged
- **WHEN** translating a document that links to external URLs (GitHub, Discord, npm, etc.)
- **THEN** the external URL remains unchanged

### Requirement: Translation directory structure
Chinese translations SHALL be placed under `docs/i18n/zh-cn/` with filenames matching the source documents.

#### Scenario: Root README translation location
- **WHEN** translating the root `README.md`
- **THEN** the translation is saved as `docs/i18n/zh-cn/README.md`

#### Scenario: Docs translation location
- **WHEN** translating a file from `docs/` (e.g., `docs/getting-started.md`)
- **THEN** the translation is saved as `docs/i18n/zh-cn/getting-started.md`

### Requirement: AI translation disclaimer
Each Chinese translation file SHALL include a disclaimer at the beginning indicating it was translated by AI, with the model name specified.

#### Scenario: Disclaimer present at file start
- **WHEN** opening any Chinese translation file under `docs/i18n/zh-cn/`
- **THEN** the file begins with a blockquote containing the AI translation notice and model name in backtick-wrapped format

### Requirement: Source document unchanged
Existing English documentation SHALL NOT be modified by this change.

#### Scenario: No changes to source files
- **WHEN** completing the translation work
- **THEN** all files under `docs/` and root `README.md` remain identical to their pre-change state
