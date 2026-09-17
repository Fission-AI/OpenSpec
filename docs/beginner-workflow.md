# Beginner workflow

This guide shows a first OpenSpec loop for a small project. It is meant for users who want to start with a light spec, hand the work to an AI coding assistant such as Codex, and avoid over-planning the first change.

## 1. Start from an empty or existing project

Install OpenSpec, then initialize it from your project root:

```bash
npm install -g @fission-ai/openspec@latest
cd your-project
openspec init
```

The init command creates an `openspec/` directory for specs, changes, and optional project configuration. Commit that directory with your project so future changes have the same source of truth.

## 2. Describe one narrow change

Pick one concrete user-visible change, bug fix, or refactor. Keep the first prompt small enough that the AI can produce artifacts you can actually review:

```text
/opsx:propose add a password reset email flow
```

Prefer prompts that name the desired behavior. Avoid starting with a broad system rewrite or a long list of unrelated features.

## 3. Review the generated artifacts

A proposal creates a change folder such as:

```text
openspec/changes/add-password-reset/
├── proposal.md
├── design.md
├── tasks.md
└── specs/
```

Before implementation, quickly check:

- `proposal.md` states the problem, scope, and non-goals.
- `specs/` contains requirements and scenarios, not implementation notes.
- `design.md` is proportional to the change.
- `tasks.md` is a checklist you would trust an agent to follow.

If anything is too broad, ask the AI to narrow the artifact before continuing.

## 4. Hand it to Codex

Once the artifacts look right, ask Codex to implement the tasks:

```text
/opsx:apply
```

For Codex sessions, a useful rhythm is:

1. Start with a clean git branch.
2. Keep the OpenSpec change folder open while reviewing code.
3. Ask Codex to update `tasks.md` as work completes.
4. Ask Codex to run focused tests before broader verification.
5. Review the final diff against `proposal.md`, `specs/`, and `tasks.md`.

## 5. Verify and archive

After implementation, run the project's normal checks. If you use the expanded workflow profile, you can also run:

```text
/opsx:verify
```

When the code and specs match, archive the change:

```text
/opsx:archive
```

Archiving merges accepted spec changes into `openspec/specs/` and moves the completed change into the archive for history.

## WSL2 and VS Code tips

- Keep the repo on the WSL filesystem when developing inside WSL2, instead of editing across `/mnt/c`.
- Open the project folder in VS Code from the same environment where you run `openspec` and Codex.
- Run `openspec init` and project tests from the project root, not from inside `openspec/changes/`.
- Commit generated OpenSpec artifacts alongside the code change so reviewers can see both intent and implementation.

## Keep the first spec light

For the first change, aim for:

- one change folder;
- one or two affected spec domains;
- a short design file, or no heavy architecture section unless the change needs it;
- tasks that can be reviewed and tested incrementally.

OpenSpec works best when the artifacts clarify the next change. They do not need to describe the entire product on day one.