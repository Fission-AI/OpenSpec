## Context

The README.md, welcome screen (`src/ui/welcome-screen.ts`), and init success message (`src/core/init.ts`) were inherited from the upstream OpenSpec fork. This enpalspec fork ships its own binary and skill set (`enpalspec:*`), but all three still advertise `opsx:*` commands and "OpenSpec" branding. Users following any of these surfaces will be directed to the wrong workflow.

## Goals / Non-Goals

**Goals:**
- Replace every user-facing `opsx:*` command reference in README.md with the equivalent `enpalspec:*` command
- Update the README example block, tip callout, and Quick Start text to reference the enpalspec workflow
- Add a brief upstream shoutout ("Built on OpenSpec") in the README
- Fix `welcome-screen.ts`: "Welcome to OpenSpec" title and `/opsx:*` quick-start commands
- Fix `init.ts`: "OpenSpec Setup Complete" heading, "OpenSpec configured:" label, and Fission-AI/OpenSpec GitHub links

**Non-Goals:**
- Updating docs pages (docs/*.md)
- Changing logos or assets
- Any behavioural code changes

## Decisions

**Direct targeted edits across three files** — the changes are a set of focused text replacements. No scripting or abstraction needed.

Command mapping:
| Old | New |
|---|---|
| `/opsx:propose` | `/enpalspec:propose` |
| `/opsx:apply` | `/enpalspec:apply` |
| `/opsx:archive` | `/enpalspec:archive` |
| `/opsx:new` | `/enpalspec:propose` |
| `/opsx:continue` | *(remove — not part of enpalspec workflow)* |

Key string replacements per file:

**README.md**
- Tip callout (line 37-39): reference `/enpalspec:propose` and enpalspec workflow
- "See it in action" code block: use `enpalspec:*` commands
- Quick Start prompt (line 101): `/enpalspec:propose`
- Add shoutout: "enpalspec is a fork of [OpenSpec](https://github.com/Fission-AI/OpenSpec)"

**src/ui/welcome-screen.ts**
- Line 20: `'Welcome to OpenSpec'` → `'Welcome to enpalspec'`
- Line 25: `'/opsx:* slash commands'` → `'/enpalspec:* slash commands'`
- Lines 28-30: replace `/opsx:new`, `/opsx:continue`, `/opsx:apply` with `/enpalspec:propose`, `/enpalspec:apply`, `/enpalspec:archive`

**src/core/init.ts**
- Line 326: `'OpenSpec configured:'` → `'enpalspec configured:'`
- Line 640: `'OpenSpec Setup Complete'` → `'enpalspec Setup Complete'`
- Lines 716-717: update learn-more and feedback links to enpal/enpalspec repo (or remove if no public repo yet)

## Risks / Trade-offs

- [Minimal risk] Text-only changes with no functional impact → no mitigation needed
- [Links] The init.ts footer links point to Fission-AI/OpenSpec. If there is no public enpalspec repo yet, these should be removed or left pointing upstream with a note.
