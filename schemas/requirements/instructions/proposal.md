Create the proposal that establishes WHAT is changing and WHY, in plain
language a non-engineer can review. Do NOT describe implementation — no API
names, wire formats, or code structure. That belongs to the repos that will
serve this change.

Sections:
- **Why**: 1-3 sentences on the problem or opportunity. Who benefits? Why now?
- **What Changes**: bullet list. Be specific about new capabilities,
  modifications, or removals. Mark breaking changes with **BREAKING**.
- **Capabilities**: which specs this creates or modifies:
  - **New Capabilities**: each becomes a new `specs/<name>/spec.md`.
    Use kebab-case names (e.g., `user-auth`, `data-export`).
  - **Modified Capabilities**: existing capabilities whose REQUIREMENTS
    change. Check `openspec/specs/` for existing names. Leave empty if none.
- **Impact**: affected systems, teams, or downstream repos.

IMPORTANT: The Capabilities section is the contract with the specs phase —
research existing specs before filling it in. Each capability listed needs a
corresponding spec file.

Keep it to 1-2 pages. Do NOT proceed to specs until the proposal has been
reviewed and approved.
