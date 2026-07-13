## Context

OpenSpec already separates CLI context helpers from agent workflows. Commands such as `/opsx:propose`, `/opsx:apply`, and `/opsx:verify` are generated from workflow templates, while CLI commands provide structured data through `status --json` and `instructions apply --json`.

The brief workflow should follow that model: agent synthesis belongs in the generated OPSX workflow, not in a deterministic CLI summary command.

## Goals / Non-Goals

Goals:
- Add `/opsx:brief` as an optional workflow users can select through custom profiles.
- Generate both skill and slash-command variants through the existing template pipeline.
- Keep `brief` out of the default `core` profile.
- Instruct agents to create a static `brief.html` in the change directory.

Non-goals:
- Add a new first-class `openspec brief` CLI command.
- Introduce LLM provider configuration into the CLI.
- Make `brief.html` authoritative over the original change artifacts.
- Generate a parallel `brief.md` file.

## Decisions

### Decision: Model brief as an optional OPSX workflow

Use the same `SkillTemplate` and `CommandTemplate` pattern as the existing OPSX workflows. This keeps installation, delivery mode, tool adapters, and profile selection consistent with the rest of OpenSpec.

Alternative considered: add `openspec brief`. That would either be a weak deterministic summary or require provider/key/model concerns in the CLI, which is too broad for this feature.

### Decision: Include brief in `ALL_WORKFLOWS`, not `CORE_WORKFLOWS`

`brief` is useful for review-heavy flows, but not every user needs another command in the default path. Keeping it optional avoids making core setup heavier while still allowing users to install it through `openspec config profile`.

### Decision: Write only `brief.html`

The requested review surface is browser-readable HTML. A second `brief.md` output would create synchronization questions without being needed for the MVP.

### Decision: Keep generated HTML self-contained and project-neutral

The workflow should instruct agents to use inline CSS and system fonts only. It should not pull Google Fonts, CDN assets, remote images, or any other network resources into `brief.html`.

The generated page should also avoid unrelated product names, project names, footers, and agent-specific implementation labels unless those details come from the source artifacts. This keeps the workflow portable across OpenSpec users and prevents local helper templates from leaking repo- or harness-specific branding into official output.

## Risks / Trade-offs

- [Risk] Agent-generated summaries can be inaccurate. -> Mitigation: require source attribution, require missing information to be called out, and state that original artifacts remain authoritative.
- [Risk] `open` behavior is platform-specific. -> Mitigation: document best-effort opener commands and treat opener failure as non-fatal.
- [Risk] Adding a workflow id can affect profile drift detection and generated command cleanup. -> Mitigation: update workflow maps and targeted tests around profile, generation, and tool detection.
- [Risk] Local or agent-specific brief templates can leak unrelated branding or external assets. -> Mitigation: require standalone, project-neutral HTML and explicitly forbid remote fonts, CDN links, network assets, unrelated footers, and harness-specific labels unless sourced from artifacts.

## Migration Plan

No data migration is required. Existing users keep the same `core` workflow set. Users who want `/opsx:brief` can select it with `openspec config profile` and apply it with `openspec update`.

## Open Questions

None for the MVP.
