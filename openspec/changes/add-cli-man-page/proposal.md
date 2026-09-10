# Ship an offline man page

## Why

`man openspec` finds nothing. The command reference exists only as `--help`,
which shows one command at a time to someone who already knows its name, and as
the docs site, which needs a browser and a network. A globally installed POSIX
CLI is expected to leave a manual behind (#491).

A hand-written manual would answer that request and then rot: every new flag
would have to be copied into it, and nothing would fail when it wasn't.

## What Changes

- The build renders `dist/man/openspec.1` from the commander program itself —
  the same object that answers `--help` — so the manual lists exactly the
  commands, arguments, and flags the CLI has, and hides what the CLI hides.
- `package.json` declares the page in `man`, so npm links it into the man path
  on a global install.
- The release guard fails when the packed tarball ships without the page, so a
  rename inside the CLI cannot silently drop the manual.

No command changes behavior. The only shipped addition is a documentation file
inside `dist/`.

## Impact

- Affected specs: `cli-man-page` (ADDED)
- Affected code: `src/core/man/man-page.ts`, `scripts/generate-man.mjs`,
  `build.js`, `package.json`, `scripts/pack-version-check.mjs`
- Affected docs: `docs/cli.md`
