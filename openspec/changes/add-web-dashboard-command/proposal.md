## Why

The existing `openspec view` command outputs a static, text-based dashboard in the terminal. While useful for quick glances, it cannot display rendered markdown content, makes it difficult to navigate large projects with many specs and archived changes, and offers no interactivity beyond reading the output. A web-based dashboard would let users browse their entire OpenSpec project visually: viewing active changes with artifact status, exploring specs organized by domain prefix, reviewing archive history, and reading any artifact's rendered markdown, all in the browser with zero external dependencies.

## What Changes

- Add new `openspec dashboard` CLI command that starts a local HTTP server and opens the default browser
- The server exposes a JSON API that surfaces project data: active changes (with artifact completion status), main specs (grouped by domain prefix), and archived changes
- The server also serves a single-page HTML dashboard with embedded CSS and JavaScript (no build step, no frontend dependencies)
- The dashboard renders markdown content inline so users can read any artifact (proposal, design, tasks, spec) without leaving the browser
- The server shuts down cleanly on SIGINT/SIGTERM or when the user presses Ctrl+C

## Capabilities

### New Capabilities
- `cli-dashboard`: A `dashboard` command that starts a local web server serving a single-page dashboard for browsing OpenSpec project data, including active changes with artifact status, main specs grouped by domain, archive history, and rendered markdown content for any artifact

### Modified Capabilities
<!-- No existing specs are being modified - this is purely additive -->

## Impact

- `src/core/dashboard.ts`: New module implementing `DashboardCommand` with HTTP server, JSON API routes, and embedded HTML/CSS/JS
- `src/cli/index.ts`: Register the `dashboard` command with Commander.js
- `package.json`: No new dependencies needed (uses Node.js built-in `http` module and a lightweight bundled markdown-to-HTML converter)
