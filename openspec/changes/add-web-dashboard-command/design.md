## Context

OpenSpec currently has a terminal-based `openspec view` command (`src/core/view.ts`) that outputs a static text dashboard using chalk for formatting. It uses `ViewCommand.getChangesData()` and `ViewCommand.getSpecsData()` to gather project data. There are also utility modules for discovering changes (`src/utils/item-discovery.ts`), parsing task progress (`src/utils/task-progress.ts`), and parsing markdown specs (`src/core/parsers/markdown-parser.ts`).

The project has zero frontend dependencies and uses Node.js built-in modules wherever possible. The CLI uses Commander.js for command registration.

## Goals / Non-Goals

**Goals:**
- Add `openspec dashboard` command that starts a local HTTP server with a web-based project dashboard
- Reuse existing data-gathering logic from `ViewCommand`, `ListCommand`, and `item-discovery` utilities
- Zero new npm dependencies (use Node.js built-in `http` and `child_process` modules)
- Serve a self-contained HTML page with inline CSS and JS
- Support viewing rendered markdown for any artifact
- Clean cross-platform behavior (Windows `start`, macOS `open`, Linux `xdg-open`)

**Non-Goals:**
- Real-time file watching or live-reload (page can be refreshed manually)
- Editing or creating artifacts from the dashboard (read-only)
- Authentication or multi-user access (local development tool)
- External CDN dependencies or build toolchains for the frontend

## Decisions

### Decision 1: Node.js Built-in HTTP Server

Use `node:http` to create the server rather than adding Express or another framework.

**Rationale:**
- Zero new dependencies aligns with the project's minimal dependency philosophy
- The API surface is small (one HTML page, ~5 JSON endpoints)
- Commander.js already handles CLI concerns; the server is a simple request router
- `node:http` is stable, well-documented, and available on all target platforms

### Decision 2: Self-Contained HTML with Inline Markdown Rendering

The dashboard is a single HTML file with inline `<style>` and `<script>` blocks, including a minimal markdown-to-HTML converter (~60 lines of JS).

**Rationale:**
- No build step required; the HTML string is embedded in the TypeScript source
- No external CDN requests (works offline and in air-gapped environments)
- The markdown subset needed is limited (headings, lists, bold, code blocks, checkboxes, links) so a minimal parser suffices
- The HTML template is generated via a function that returns a template literal, making it easy to maintain

### Decision 3: Domain Grouping by Prefix

Specs are grouped by the prefix before the first hyphen in their directory name (e.g., `cli-init` and `cli-view` both go under domain "cli"). Specs with no hyphen use their full name as the domain.

**Rationale:**
- Matches the existing naming convention in the project (`cli-*`, `opsx-*`, etc.)
- Provides useful organization without requiring explicit domain configuration
- Simple and deterministic—no configuration needed

### Decision 4: Reuse Existing Data Utilities

The `DashboardCommand` class reuses `getTaskProgressForChange()`, `MarkdownParser`, and file-reading patterns from `ViewCommand` / `ListCommand` rather than implementing new data access.

**Rationale:**
- Keeps behavior consistent with the terminal dashboard
- Avoids duplicating file system traversal logic
- If the data model changes, only one place needs updating

### Decision 5: Browser Opening via child_process

Use `child_process.exec()` with platform-specific commands (`open` on macOS, `xdg-open` on Linux, `start` on Windows) to open the browser.

**Rationale:**
- Standard cross-platform approach used by many CLI tools
- No dependency on the `open` npm package
- Failures are non-fatal (user can always navigate manually)

### Decision 6: Port Selection with Fallback

Default to port 3000. If the user doesn't specify `--port` and port 3000 is unavailable, increment and try successive ports up to 3010.

**Rationale:**
- Port 3000 is a conventional default for development servers
- Auto-fallback avoids frustration when another process is using the port
- `--port` flag gives explicit control when needed
- Limiting fallback range (10 ports) avoids silently binding to unexpected ports

## Risks / Trade-offs

**Risk: Inline HTML becomes large and hard to maintain**
The HTML template embedded in TypeScript could grow. Mitigation: Keep the dashboard focused on reading project data (no editing features). The HTML function is isolated and can be extracted to a separate `.html` file loaded at runtime if it grows beyond ~300 lines.

**Risk: Minimal markdown parser doesn't handle edge cases**
A 60-line parser won't support every markdown feature. Mitigation: OpenSpec artifacts use a consistent subset of markdown (headings, lists, bold, code fences, checkboxes). The parser handles this subset. Full GFM support is a non-goal for v1.

**Risk: Cross-platform browser opening**
`child_process.exec()` with platform commands may fail on unusual configurations. Mitigation: Failures are caught and logged as warnings; the URL is always printed to stdout so users can navigate manually.
