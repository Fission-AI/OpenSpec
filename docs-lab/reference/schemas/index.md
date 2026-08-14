# Overview

> Every available workflow schema and the artifacts it defines.

<!-- This group states the formats. How schemas shape artifacts and how to
change or write one is customize/schemas.md's job. -->

A schema defines which artifacts a change proposal produces, and in what order. On disk it's a folder with a schema.yaml in it; every field of that file is on the [schema.yaml](schema-yaml.md) page.

## Available schemas

One schema ships with the CLI:

| Schema | Artifacts |
|---|---|
| [spec-driven](spec-driven/index.md) (default) | `proposal`, `specs`, `design`, `tasks` |

A project can add its own schemas, and a machine can override globally; where those folders live and which copy wins is in schema.yaml's [Location](schema-yaml.md#location) section.

In your terminal, [`openspec schemas`](../cli.md#openspec-schemas) prints every schema your project can see.
