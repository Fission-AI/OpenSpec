## ADDED Requirements

### Requirement: Dashboard Command Registration

The system SHALL provide an `openspec dashboard` command that starts a local web server and opens a browser-based dashboard.

#### Scenario: Command invocation with defaults

- **WHEN** user runs `openspec dashboard`
- **THEN** system starts an HTTP server on port 3000 (or next available port)
- **AND** opens the default browser to `http://localhost:<port>`
- **AND** prints the URL to stdout

#### Scenario: Custom port option

- **WHEN** user runs `openspec dashboard --port 8080`
- **THEN** system starts the HTTP server on port 8080
- **AND** if port 8080 is in use, exits with an error message

#### Scenario: No-open option

- **WHEN** user runs `openspec dashboard --no-open`
- **THEN** system starts the server but does not open the browser
- **AND** prints the URL to stdout so user can navigate manually

#### Scenario: No openspec directory

- **WHEN** user runs `openspec dashboard` in a directory without an `openspec/` folder
- **THEN** system exits with error message indicating OpenSpec is not initialized

#### Scenario: Graceful shutdown

- **WHEN** user presses Ctrl+C or sends SIGINT/SIGTERM
- **THEN** system closes the HTTP server and exits cleanly

### Requirement: JSON API

The server SHALL expose a JSON API for the dashboard frontend to consume project data.

#### Scenario: GET /api/changes

- **WHEN** frontend requests `GET /api/changes`
- **THEN** server responds with JSON containing arrays for `draft`, `active`, and `completed` changes
- **AND** each active change includes `name` and `progress` (with `completed` and `total` task counts)
- **AND** each change includes an `artifacts` list showing which artifact files exist

#### Scenario: GET /api/specs

- **WHEN** frontend requests `GET /api/specs`
- **THEN** server responds with JSON array of specs, each containing `name`, `domain` (prefix before first hyphen or full name), and `requirementCount`

#### Scenario: GET /api/archive

- **WHEN** frontend requests `GET /api/archive`
- **THEN** server responds with JSON array of archived change names sorted reverse-chronologically

#### Scenario: GET /api/artifact

- **WHEN** frontend requests `GET /api/artifact?type=change&name=<name>&file=<path>`
- **THEN** server responds with JSON containing the raw markdown `content` of that artifact file
- **AND** the `file` parameter supports paths like `proposal.md`, `design.md`, `tasks.md`, `specs/<name>/spec.md`

#### Scenario: GET /api/artifact for specs

- **WHEN** frontend requests `GET /api/artifact?type=spec&name=<name>`
- **THEN** server responds with the raw markdown content of `openspec/specs/<name>/spec.md`

#### Scenario: GET /api/artifact for archived changes

- **WHEN** frontend requests `GET /api/artifact?type=archive&name=<name>&file=<path>`
- **THEN** server responds with the raw markdown content of the file inside `openspec/changes/archive/<name>/<path>`

#### Scenario: Artifact not found

- **WHEN** frontend requests an artifact that does not exist
- **THEN** server responds with 404 status and a JSON error message

#### Scenario: Path traversal prevention

- **WHEN** frontend requests an artifact path containing `..` segments
- **THEN** server responds with 400 status and rejects the request
- **AND** the resolved path must remain within the `openspec/` directory

### Requirement: Dashboard HTML Page

The server SHALL serve a single-page HTML dashboard at the root URL with embedded CSS and JavaScript.

#### Scenario: Page load

- **WHEN** browser navigates to `http://localhost:<port>/`
- **THEN** server responds with a self-contained HTML page (inline styles and scripts, no external dependencies)

#### Scenario: Active changes section

- **WHEN** dashboard loads change data
- **THEN** it displays a section showing draft, active, and completed changes
- **AND** active changes show progress bars and artifact status indicators
- **AND** clicking a change name reveals its artifacts for viewing

#### Scenario: Specs section

- **WHEN** dashboard loads spec data
- **THEN** it displays specs grouped by domain prefix (e.g., all `cli-*` specs under a "cli" domain heading)
- **AND** each spec shows its requirement count
- **AND** clicking a spec name opens its rendered markdown content

#### Scenario: Archive section

- **WHEN** dashboard loads archive data
- **THEN** it displays archived changes sorted reverse-chronologically
- **AND** clicking an archived change reveals its artifacts for viewing

#### Scenario: Markdown rendering

- **WHEN** user clicks an artifact to view
- **THEN** dashboard fetches the raw markdown via the API
- **AND** renders it as formatted HTML using a lightweight client-side markdown parser
- **AND** displays it in a content panel alongside the navigation

#### Scenario: Cross-platform path handling

- **WHEN** dashboard constructs file paths for API requests
- **THEN** it uses forward slashes in URL parameters regardless of host OS
- **AND** the server normalizes paths using `path.join()` internally

### Requirement: Error Handling

The dashboard SHALL handle errors gracefully without crashing.

#### Scenario: Malformed API requests

- **WHEN** API receives a request with missing or invalid parameters
- **THEN** server responds with appropriate 4xx status and descriptive JSON error

#### Scenario: File system errors

- **WHEN** reading a file fails due to permissions or corruption
- **THEN** server responds with 500 status and a JSON error message
- **AND** the server continues running for subsequent requests
