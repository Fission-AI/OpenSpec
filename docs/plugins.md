# Plugins & the marketplace

OpenSpec's core stays small and sharp. Specialized, heavier capabilities ship as
**plugins** — separate npm packages that OpenSpec discovers, surfaces under their
own command namespace, and runs on demand. The first marketplace plugin is
[OpenLore](https://github.com/clay-good/OpenLore), which reverse-engineers
OpenSpec specs from an existing codebase so you can adopt OpenSpec without writing
every spec by hand.

## How plugins work

A plugin is an ordinary npm package that declares an OpenSpec **manifest**. When a
plugin is installed and enabled, OpenSpec:

- surfaces it under one reserved command **namespace** (e.g. `openspec lore …`);
- **delegates** execution to the plugin's own executable as a child process —
  OpenSpec never loads plugin code into its own process, so a plugin's heavy
  dependencies load only when you actually run its commands;
- can install **skills** the plugin contributes into every AI tool you use.

Because execution is delegated, plugins can have their own dependencies and even
their own Node version requirements without affecting OpenSpec.

## Quick start

```bash
# Discover plugins in the curated registry
openspec plugin search

# Add OpenLore to your project (prints install guidance; --install runs npm)
npm install --save-dev openlore
openspec plugin add openlore

# Now OpenLore is available under the `lore` namespace
openspec lore --help
openspec lore generate          # generate initial specs from your code
openspec validate --specs       # OpenSpec takes over from here
```

## The `openspec plugin` commands

| Command | Description |
| --- | --- |
| `openspec plugin list [--json]` | Installed plugins with status, source tier, and version |
| `openspec plugin info <id> [--json]` | Manifest and registry details for one plugin |
| `openspec plugin search [query] [--json]` | Discover plugins in the curated registry |
| `openspec plugin add <id> [--force] [--install]` | Enable a plugin in this project |
| `openspec plugin remove <id>` | Disable a plugin (does not uninstall the package) |
| `openspec plugin enable <id>` / `disable <id>` | Toggle a plugin without uninstalling it |

Enablement is recorded in your project `openspec/config.yaml` under a `plugins`
block, so it is committed and shared by your team:

```yaml
schema: spec-driven
plugins:
  enabled:
    - openlore
```

By default OpenSpec **auto-detects** any installed package that declares a plugin
manifest, so an installed plugin works without an explicit `enabled` entry. Turn
this off with `plugins.autoDetect: false` (project config) or in global config.

## Compatibility

Each plugin declares the OpenSpec version range it supports. Plugins outside the
running version's range are listed as `incompatible` and are not registered as
commands. `openspec plugin add` refuses to enable an incompatible plugin unless
you pass `--force`.

## Trust

Plugins are npm packages that run with your privileges, the same as any
dev-dependency or `npx` invocation. OpenSpec does not sandbox them. The registry
is curated (entries are reviewed), and enabling a package that is not in the
registry prints a one-time trust notice. Only add plugins you trust.

## Authoring a plugin

Add an `"openspec"` key to your package's `package.json` (or ship a sibling
`openspec.plugin.json`):

```json
{
  "name": "my-engine",
  "version": "1.0.0",
  "bin": "dist/cli.js",
  "openspec": {
    "manifestVersion": 1,
    "id": "my-engine",
    "namespace": "mine",
    "bin": "dist/cli.js",
    "openspecCompat": ">=1.0.0",
    "displayName": "My Engine",
    "summary": "What this engine does",
    "commands": [{ "name": "run", "summary": "Run the engine" }],
    "skills": [{ "dir": "my-skill", "source": "skills/my-skill" }]
  }
}
```

Manifest fields:

- `manifestVersion` (required) — currently `1`.
- `id` (required) — unique plugin id.
- `namespace` (required) — lowercase letters/digits/dashes; must not collide with
  a core command or another enabled plugin.
- `bin` or `binArgs` (one required) — `bin` is a path within your package run with
  the current Node; `binArgs` is an explicit command + args (e.g. `["npx", "my-engine"]`).
- `openspecCompat` (required) — semver range of supported OpenSpec versions.
- `commands` (optional) — surfaced subcommands for help and completion.
- `skills` (optional) — skill directories (each containing a `SKILL.md`) installed
  into AI tool directories by `openspec init`/`update`.
- `ownsConfigKeys` (optional) — top-level `config.yaml` keys your plugin manages.

Your executable receives every argument after the namespace verbatim, inherits
the terminal, and its exit code becomes OpenSpec's exit code.

### Getting listed in the marketplace

The registry is a curated JSON index shipped with OpenSpec
(`schemas/plugins/registry.json`). To propose a listing, open a pull request
adding your plugin's `id`, `npm` package name, `namespace`, `openspecCompat`,
`summary`, and `homepage`.

## Relationship to OpenLore

OpenLore and OpenSpec are complementary: **OpenLore generates initial specs from
existing code; OpenSpec validates and evolves them.** This makes adopting OpenSpec
on an established codebase a first-class, code-first path:

```bash
openspec init
openspec lore generate      # OpenLore: archaeology over existing code → specs
openspec validate --specs   # core OpenSpec validates and evolves them
```

See the [OpenLore project](https://github.com/clay-good/OpenLore) for details.
