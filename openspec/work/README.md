# OpenSpec Work

This directory is an experimental home for Git-native work artifacts.

The current experiment separates the work model into four layers:

```text
goal -> roadmap -> slice -> result
```

- `goal.md` describes the destination: what we are trying to make true and why.
- `roadmap.md` describes the current path toward that goal. It is expected to
  change as implementation reveals better sequencing.
- `slices/<id>/spec.md` describes one small desired outcome.
- `slices/<id>/plan.md` describes how that slice will be implemented and
  verified.
- `slices/<id>/result.md` records what actually happened and the evidence that
  the slice passed, failed, or needs follow-up.
- `slices/<id>/log.md` is optional. Use it only when important changes need a
  short explanation of what changed, why, and what downstream artifacts were
  affected.

The goal is to keep high-level work lightweight while still giving agents and
humans enough structure to move one slice at a time.

Rule of thumb:

```text
spec.md says what must be true.
plan.md says how we intend to get there.
result.md says what actually happened.
```

## Shape

```text
openspec/work/
  README.md
  <work-id>/
    goal.md
    roadmap.md
    slices/
      <slice-id>/
        spec.md
        plan.md
        result.md
        log.md
```

## Workflow

Start with the goal, then maintain a loose roadmap. The roadmap is a living
sequence of likely slices, not a promise to execute everything in order.

For each slice:

1. Explore and interview until the slice has a useful `spec.md`.
2. Generate `plan.md` only when the spec is clear enough to implement.
3. Execute the plan.
4. Record proof, verification output, and follow-ups in `result.md`.
5. Update `roadmap.md` when the result changes the path forward.

## Revision Rules

Edit `spec.md` when the desired slice outcome changes.

Edit `plan.md` when the implementation path changes but the slice outcome is
still the same.

Create or update `result.md` when implementation or verification has happened.
Do not use it as the source of truth for current intent.

Add `log.md` entries when a meaningful pivot would be hard to understand from
the final files alone.

Create a new slice when the new work can be accepted, scheduled, verified, or
shipped independently.

## Compatibility

This directory is experimental. Current OpenSpec CLI validation, archive, and
spec update behavior still centers on `openspec/changes/` and
`openspec/specs/`.

Use `/work` to coordinate and learn. When a slice needs today's executable
OpenSpec lifecycle, project that slice into a normal `openspec/changes/<id>/`
artifact until `/work` has first-class CLI support.
