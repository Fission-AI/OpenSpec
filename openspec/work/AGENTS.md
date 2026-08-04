# Agent Guidance For `/work`

When working in this directory, use a product-facing lens first.

Start from how the work is experienced by users, not from the internal command
or file structure. In this product there are two users:

- Humans: they usually do OpenSpec work by prompting agents. They may run shell
  commands for interactive setup or one-off actions, but prompts are the normal
  interface.
- Agents: they need clear intent, discoverable state, unambiguous next actions,
  and enough structured output to act safely.

Good human UX is usually good agent UX. A flow that is easy for a human to ask
for and understand is usually easier for an agent to execute, verify, and
explain.

For roadmap or slice exploration:

- Describe the user-facing flow before the internal implementation.
- Ask what the human sees, asks for, approves, or corrects.
- Ask what the agent must discover, decide, execute, and report back.
- Ground reasoning in the current repo behavior before proposing new shape.
- Treat shell commands as supporting mechanics, not the primary product story.
- Prefer concrete workflows over abstract model language.

When an answer gets confusing, reframe it as:

```text
What does the human want?
What does the agent need to know?
Where does the work live?
What changes on disk?
How does the user know it worked?
```
