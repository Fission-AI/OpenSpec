## 1. Project Setup and Command Registration

- [x] 1.1 Create directory structure: `src/core/dashboard/` with `index.ts`, `server.ts`, `data.ts`, `markdown.ts`
- [x] 1.2 Register `openspec dashboard` command in `src/cli/index.ts` with `--port` and `--no-open` options
- [x] 1.3 Create `DashboardCommand` class in `src/core/dashboard/index.ts` that validates openspec directory exists

## 2. Data Gathering Module

- [x] 2.1 Implement `getChangesData()` in `data.ts` that returns draft/active/completed changes with artifact existence status (proposal.md, specs/, design.md, tasks.md)
- [x] 2.2 Implement `getSpecsData()` in `data.ts` that returns specs grouped by domain prefix with requirement counts
- [x] 2.3 Implement `getArchiveData()` in `data.ts` that returns archived changes with parsed dates, sorted reverse chronologically
- [x] 2.4 Implement `getSummary()` in `data.ts` that aggregates counts for dashboard summary section
- [x] 2.5 Implement `getArtifactContent()` in `data.ts` that reads a markdown file by relative path with path traversal protection

## 3. Markdown Renderer

- [x] 3.1 Implement markdown-to-HTML converter in `markdown.ts` handling headings, paragraphs, bold, italic, and line breaks
- [x] 3.2 Add support for fenced code blocks and inline code
- [x] 3.3 Add support for unordered lists, ordered lists, and checkboxes
- [x] 3.4 Add support for blockquotes, horizontal rules, and links

## 4. HTTP Server and API

- [x] 4.1 Implement HTTP server in `server.ts` using Node.js built-in `http` module
- [x] 4.2 Add route `GET /` that serves the embedded single-page HTML dashboard
- [x] 4.3 Add route `GET /api/summary` returning aggregated project data
- [x] 4.4 Add route `GET /api/changes` returning changes with artifact status
- [x] 4.5 Add route `GET /api/specs` returning specs grouped by domain
- [x] 4.6 Add route `GET /api/archive` returning archive entries with pagination (default 50)
- [x] 4.7 Add route `GET /api/artifact?path=<relative>` returning rendered markdown HTML with path traversal guard
- [x] 4.8 Implement port selection with auto-increment from default 3000 to 3010
- [x] 4.9 Implement cross-platform browser opening (open/xdg-open/start)
- [x] 4.10 Add graceful shutdown on SIGINT/SIGTERM

## 5. Dashboard HTML/CSS/JS

- [x] 5.1 Create embedded HTML template with navigation tabs for Changes, Specs, and Archive sections
- [x] 5.2 Implement Changes view with status grouping (draft/active/completed), artifact indicators, and progress bars
- [x] 5.3 Implement Specs view with domain-prefix grouping and requirement count display
- [x] 5.4 Implement Archive view with date-based listing and "load more" pagination
- [x] 5.5 Implement artifact detail panel that fetches and displays rendered markdown on click
- [x] 5.6 Add basic responsive CSS styling with monospace fonts matching terminal aesthetic

## 6. Testing

- [x] 6.1 Add unit tests for markdown renderer in `test/core/dashboard/markdown.test.ts`
- [x] 6.2 Add unit tests for data gathering functions in `test/core/dashboard/data.test.ts`
- [x] 6.3 Add unit tests for path traversal prevention in artifact endpoint
- [x] 6.4 Add unit tests for port selection logic
- [x] 6.5 Add unit tests for domain grouping logic
- [x] 6.6 Add unit tests for archive date parsing

## 7. Polish and Integration

- [x] 7.1 Add CLI help text for the dashboard command
- [x] 7.2 Add shell completion entries for dashboard command and its options
- [x] 7.3 Handle edge cases: empty project, missing directories, unparseable specs
- [x] 7.4 Ensure cross-platform path handling with `path.join()` throughout
- [x] 7.5 Run linting and fix any issues (`pnpm run lint`)
- [x] 7.6 Run full test suite (`pnpm test`)
