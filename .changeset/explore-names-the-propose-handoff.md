---
"@fission-ai/openspec": patch
---

Name the propose workflow where explore hands off. Explore mode refuses to implement, but every place it said what to do instead — the refusal itself, the "flow into a proposal" ending, the closing summary, and the do-not-implement guardrail — described the next step as prose ("create a change proposal") without naming the workflow that does it. With no named exit, agents finished the discovery questions and started writing code, which is the failure reported through GitHub Copilot in #869. The explore skill and command now point at `/opsx:propose` at all four handoff points, written in the canonical `/opsx:<id>` form so each tool renders the invocation it actually registers (`/openspec-propose` for skills-only delivery, `/opsx-propose` or `/opsx:propose` for command surfaces). Fixes #869.
