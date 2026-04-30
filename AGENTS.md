## Product Thinking

When discussing workflows, documentation, onboarding, or product behavior, start from the user's goal and lived interaction. Do not translate the problem into CLI commands, config flags, file formats, or internal implementation steps as the primary answer unless the user explicitly asks for that level.

Default framing:

- What is the user trying to accomplish?
- Where are they starting from?
- What should they say or do in the product experience?
- What should the agent/system do on their behalf?
- What outcome should they see?

Only after that, mention commands, files, APIs, or implementation mechanics as supporting detail. Treat these as backing mechanisms, not the user journey.

Bad pattern:

```text
Run command X, then command Y, then command Z.
```

Better pattern:

```text
Open the relevant experience and tell the agent what outcome you want. The system should guide the workflow and may use command X/Y/Z internally.
```

If the user is critiquing UX, docs, or workflow design, do not answer with a bare CLI recipe. First restate the intended human workflow, then identify where the current product forces implementation details onto the user.
