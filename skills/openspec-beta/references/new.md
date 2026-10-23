Start a new change using the experimental artifact-driven approach.

**Input**: The user's request should include a change name (kebab-case) OR a description of what they want to build.

**Steps**

1. **Understand the request**

   If there is no clear input, ask (open-ended, no preset options):
   > "What change do you want to work on? Describe what you want to build or fix."

   Derive a kebab-case name ("add user authentication" → `add-user-auth`). Do not continue without understanding what the user wants to build. If the name is not kebab-case, ask for a valid one.

2. **Choose the schema**

   Omit `--schema` to use the default. Pass `--schema <name>` only when the user names one. If they ask what workflows exist, run `openspec schemas --json` and let them choose.

3. **Create the change**
   ```bash
   openspec new change "<name>"
   ```
   Add `--schema <name>` only for a requested workflow. The CLI scaffolds the change in the planning home it resolves. If a change with that name already exists, suggest continuing that change instead.

4. **Show the artifact status**
   ```bash
   openspec status --change "<name>" --json
   ```
   Use the returned `planningHome`, `changeRoot`, `artifactPaths`, and `nextSteps` instead of assuming repo-local paths.

5. **Show the first artifact's instructions**

   Find the first artifact with status "ready" (`proposal` for spec-driven) and run:
   ```bash
   openspec instructions <first-artifact-id> --change "<name>"
   ```

6. **STOP and wait for user direction**

**Output**

The change name and location, the schema and its artifact sequence, the status (0/N artifacts complete), the first artifact's template, and: "Ready to create the first artifact? Just describe what this change is about and I'll draft it, or ask me to continue."

**Guardrails**
- Do NOT create any artifacts yet - just show the instructions
- Do NOT advance beyond showing the first artifact template
