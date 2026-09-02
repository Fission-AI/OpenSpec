# CLI settings (config.json)

> Every field of config.json: how the openspec CLI behaves on your machine.

## Location

The CLI keeps its machine-level settings at `~/.config/openspec/config.json` on macOS and Linux, and `%APPDATA%\openspec\config.json` on Windows. `$XDG_CONFIG_HOME` wins on every platform when set. The `openspec config` command reads and edits it.

## Fields

| Key | Type | Required | Effect |
| --- | --- | --- | --- |
| `profile` | string: `core` or `custom` | No | Picks the workflow set `openspec init` installs |
| `delivery` | string: `both`, `skills`, or `commands` | No | Whether init installs skills, slash commands, or both |
| `workflows` | list of strings | No | The workflow list a `custom` profile installs |
| `featureFlags` | map: flag → boolean | No | Boolean feature toggles |
| `defaultStore` | string | No | Machine-level fallback store for root resolution |
| `openers` | map: tool id → settings | No | The tools worksets open in, and how each is launched |
| `telemetry` | map | No | State the CLI keeps: anonymous id and notice-seen |

### profile

Which workflow set `openspec init` installs. Defaults to `core`: propose, explore, apply, update, sync, and archive. Setting `custom` installs exactly the `workflows` list instead.

### delivery

Whether init installs workflows as skills, as slash commands, or both. Defaults to `both`.

### workflows

The workflows a `custom` profile installs; ignored when the profile is `core`. Valid ids: `propose`, `explore`, `new`, `continue`, `apply`, `update`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`.

### featureFlags

Boolean toggles keyed by flag name, set with `openspec config set featureFlags.<flag> true`. No flag is read by the CLI today.

### defaultStore

The machine-level fallback store id for root resolution, consulted only when no `--store` flag, local `openspec/`, or project `store:` pointer resolves. The full ladder is [Root resolution](stores.md#root-resolution).

### openers

The tools a workset can open in, keyed by tool id. Edit `openers` in the global `config.json` with `openspec config edit` in your terminal.

| Field | Contract |
| --- | --- |
| `style` | `workspace-file` or `attach-dirs`. Required for a new tool; optional for a built-in. |
| `label` | Non-empty string shown in the tool picker. Defaults to the id for a new tool. |
| `command` | Non-empty executable name or path. Defaults to the id for a new tool. Put arguments in `args`, not in this string. |
| `args` | Array of strings passed before the workspace file or attach flags. Defaults to `[]` for a new tool. |
| `attach_flag` | Non-empty string paired with each member path for `attach-dirs`. Defaults to `--add-dir` for a new tool. Ignored for `workspace-file`. |

**Built-in overrides:** `code`, `cursor`, `claude`, and `codex` retain any fields you omit. Setting `args` replaces the entire argument list; `[]` clears it.

**Launch styles:** `workspace-file` passes the generated `.code-workspace` path to the executable, which must support that format. `attach-dirs` passes one flag/path pair per member, including the primary member.

**Availability:** `attach-dirs` openers, including Claude Code and Codex, are temporarily disabled by default. They are hidden from the picker and rejected by `workset open --tool`. Configuration overrides do not enable the `attach-dirs` launch style.

**Validation:** unknown fields, invalid types, and a new tool without `style` fail when a workset command reads the opener table.

This example adds VS Code Insiders and passes `--new-window` whenever the built-in VS Code opener launches:

```json
{
  "openers": {
    "code-insiders": {
      "style": "workspace-file",
      "label": "VS Code Insiders"
    },
    "code": {
      "args": ["--new-window"]
    }
  }
}
```

The corresponding `code-insiders` or `code` executable must be installed and available on `PATH`.

### telemetry

State the CLI writes for telemetry: your anonymous id and whether the first-run notice was shown. It is not the opt-out. Disabling telemetry is an environment variable, on [Environment variables](environment-variables.md).

## Example

A filled-in config.json:

```json
{
  "profile": "core",
  "delivery": "both",
  "featureFlags": {},
  "telemetry": {
    "anonymousId": "5f8a2c1e-4b6d-4f9a-9c3d-7e1b2a8d4c6f",
    "noticeSeen": true
  }
}
```
