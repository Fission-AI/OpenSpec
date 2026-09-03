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
| `openers` | list | No | The tools worksets open in, and how each is launched |
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

The machine-level fallback store id for root resolution, consulted only when no `--store` flag, local `openspec/`, or project `store:` pointer resolves. The full ladder is [Root resolution](../../multi-repo/stores.md#where-artifacts-get-created-when-using-stores).

### openers

The tools a workset can open in, and how each is launched. Entries are hand-edited and validated on use. Each may set `style` (`workspace-file` or `attach-dirs`), `label`, `command`, `args`, and `attach_flag`, and is merged over the built-in defaults.

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
