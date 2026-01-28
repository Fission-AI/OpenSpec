## 1. Create Dashboard Module

- [ ] 1.1 Create `src/core/dashboard.ts` with `DashboardCommand` class containing an `execute(options)` method
- [ ] 1.2 Implement HTTP server creation using `node:http` with request routing for `/`, `/api/changes`, `/api/specs`, `/api/archive`, `/api/artifact`
- [ ] 1.3 Implement `GET /api/changes` endpoint that returns `{ draft, active, completed }` arrays with artifact existence info and task progress, reusing `getTaskProgressForChange()` and file system checks
- [ ] 1.4 Implement `GET /api/specs` endpoint that returns specs with `name`, `domain` (prefix before first hyphen), and `requirementCount` using `MarkdownParser`
- [ ] 1.5 Implement `GET /api/archive` endpoint that returns archived change names sorted reverse-chronologically
- [ ] 1.6 Implement `GET /api/artifact` endpoint with `type`, `name`, and `file` query parameters, reading raw markdown content from the appropriate directory
- [ ] 1.7 Add path traversal prevention: reject any `file` parameter containing `..` and verify resolved paths remain within `openspec/`
- [ ] 1.8 Implement port selection logic: try default port 3000 (or `--port` value), auto-increment up to +10 if default is in use
- [ ] 1.9 Implement cross-platform browser opening using `child_process.exec()` with `open` (macOS), `xdg-open` (Linux), `start` (Windows)
- [ ] 1.10 Add graceful shutdown on SIGINT/SIGTERM

## 2. Create Dashboard HTML

- [ ] 2.1 Create a `getDashboardHtml()` function in `src/core/dashboard.ts` that returns a self-contained HTML string with inline CSS and JS
- [ ] 2.2 Implement the dashboard layout with sidebar navigation (Changes, Specs, Archive sections) and a main content panel for rendered markdown
- [ ] 2.3 Implement JavaScript to fetch `/api/changes` and render draft/active/completed changes with progress bars and artifact status indicators
- [ ] 2.4 Implement JavaScript to fetch `/api/specs` and render specs grouped by domain prefix with requirement counts
- [ ] 2.5 Implement JavaScript to fetch `/api/archive` and render archived changes sorted reverse-chronologically
- [ ] 2.6 Implement a minimal client-side markdown-to-HTML renderer supporting headings, paragraphs, bold, italic, inline code, code fences, unordered/ordered lists, checkboxes, links, and horizontal rules
- [ ] 2.7 Implement artifact viewing: clicking an artifact fetches its markdown via `/api/artifact` and renders it in the content panel

## 3. Register CLI Command

- [ ] 3.1 Import `DashboardCommand` in `src/cli/index.ts` and register `openspec dashboard` command with `--port <number>` and `--no-open` options
- [ ] 3.2 Follow existing error handling pattern (try/catch with `ora().fail()` and `process.exit(1)`)

## 4. Verify

- [ ] 4.1 Run `pnpm run build` to ensure TypeScript compiles without errors
- [ ] 4.2 Run `pnpm test` to ensure no existing tests are broken
- [ ] 4.3 Manually test `openspec dashboard` in the project directory: verify browser opens, changes/specs/archive load, and markdown rendering works
