# Tasks

## 1. Render the manual from the CLI
- [x] 1.1 Walk the commander tree through its public Help API, so hidden commands stay hidden
- [x] 1.2 Escape roff in one pass, and keep every description on a single source line
- [x] 1.3 Wrap source lines, protecting each one the wrap creates
- [x] 1.4 Carry exit status, environment, files, and examples, held to `docs/cli.md` by tests
- [x] 1.5 Cover the header, nested subcommands, aliases, escaping, and the real CLI with tests

## 2. Generate and ship it
- [x] 2.1 Write `dist/man/openspec.1` after tsc, honoring `SOURCE_DATE_EPOCH`
- [x] 2.2 Declare the page in `package.json` `man` and verify a global npm install links it
- [x] 2.3 Fail the release guard when the packed tarball has no page

## 3. Say where it is
- [x] 3.1 Document `man openspec` in `docs/cli.md`, including the fallback for package managers that do not link man pages
- [x] 3.2 Add the cancelled-at-a-prompt exit code the reference was missing
