---
"@fission-ai/openspec": patch
---

Name the workflow where explore hands off. Explore mode refuses to implement, but every place it said what to do instead described the next step as prose ("create a change proposal") without naming the workflow that does it — the refusal itself, the "flow into a proposal" ending, the closing summary, and the do-not-implement guardrail. Its seamless capture path was worse: it scaffolded a change, wrote artifacts, and then said nothing at all about what came next. With no named exit, agents finished the discovery questions and started writing code, which is the failure reported through GitHub Copilot in #869 — and which the docs already promised would not happen ("when the picture is clear, it hands off to `/opsx:propose`").

The explore skill and command now name `/opsx:propose` at all four prose handoffs, and the capture path ends by naming `/opsx:propose` for the remaining planning artifacts and `/opsx:apply` for implementation, with an explicit note that capturing artifacts is not permission to implement them. Both workflows are `CORE_WORKFLOWS` members, and the references are written in the canonical `/opsx:<id>` form so each tool renders the invocation it actually registers (`/openspec-propose` for skills-only delivery, `/opsx-propose`, `/opsx:propose`, or `@opsx-propose` for command surfaces). Fixes #869.
