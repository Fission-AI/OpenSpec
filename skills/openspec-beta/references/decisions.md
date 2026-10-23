# Decisions to raise

Decide the small things yourself and say what you chose. Raise a decision when a wrong guess would be costly to undo, or would change what others rely on:

- **Breaking behavior**: an output, error, flag, data shape, or default that users or tests depend on.
- **Data**: migrations, deletion, retention, anything that cannot be rolled back.
- **Security and privacy**: who can see or do what, secrets, personal data.
- **Public surface**: a new API, CLI flag, file format, or config key that others will build on.
- **Scope**: anything the user did not ask for, or a request that reads two ways.
- **Dependencies and cost**: a new service, library, or ongoing expense.

**How to raise one:**
- If the request already answers it, follow the request. If the user is there to answer, ask before writing the artifact it would change.
- Give two or three options in a line each, with your recommendation and its trade-off. Put related questions in one message.
- When you must go on without an answer, pick the option that keeps today's behavior, and mark it as an assumption where a reviewer will see it.
- Record the answer where it belongs: the choice and its reason in the design (or the proposal when there is no design), the behavior it leads to in the specs.
