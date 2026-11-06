# Naming capabilities

A capability is one area of behavior the system keeps, with one spec at `openspec/specs/<capability>/spec.md`. Changes come and go; capabilities stay.

**Reuse before you create.** Run `openspec list --specs` and read the specs that look related. If one already covers the area, change it under its exact path, even if you would have named it differently.

**Name the behavior, not the work.**

| Good | Not | Why not |
|---|---|---|
| `task-due-dates` | `add-due-dates` | names the work, which is over once the change is archived |
| `user-auth` | `login-endpoint-v2` | names the code and a version |
| `billing/invoices` | `misc`, `core`, `improvements` | catch-alls with no boundary |

**Pick a boundary that can grow.** A good capability is one a person would look up by name ("how do invoices work?"), and it owns requirements that change for the same reasons. Too broad, and every change touches it. Too narrow, and readers hunt across folders for one behavior.

Use kebab-case. Nest (`billing/invoices`) only where the project already nests.
