Fast-forward through artifact creation - generate everything needed to start implementation in one go.

**Input**: The user's request should include a change name (kebab-case) OR a description of what they want to build.

**Steps**

1. **If no clear input provided, ask what they want to build**

   Ask (open-ended, no preset options): "What change do you want to work on? Describe what you want to build or fix." Derive a kebab-case name ("add user authentication" → `add-user-auth`). Do NOT proceed without understanding what the user wants to build.

2. **Read the related specs**

   Run `openspec list --specs --json`, then read each spec this change could touch in full: `openspec show "<spec-id>" --type spec`. Keep the names they use, reuse an existing capability's exact path rather than a near-duplicate, describe today's behavior as they do, and call out any conflict with a current requirement. If the change alters what an existing requirement promises (a new field its export or listing must now carry), it needs a MODIFIED delta too; read `references/deltas.md` before writing one. Never add a requirement that repeats a promise the spec already makes; extend that requirement instead. If no capability is related, say so in one line and continue. Before naming a new capability, read `references/capabilities.md`.

3. **Create the change directory**
   ```bash
   openspec new change "<name>"
   ```
   If a change with that name already exists, suggest continuing that change instead.

4. **Find the artifacts to write**
   ```bash
   openspec status --change "<name>" --json
   ```
   The set to write is `applyRequires` plus every artifact those reach through `requires` edges (spec-driven: proposal, specs, design, tasks). Follow the edges, not `status`: status only checks that files exist, so a `done` artifact can still depend on a missing one. Leave artifacts outside the set alone.

5. **Write them, in dependency order**

   Track the set in a todo list. For each `ready` artifact:
   - Run `openspec instructions <artifact-id> --change "<name>" --json`, and re-read its finished dependencies from disk.
   - **Look at the project first**, read-only and in proportion to the change: its `context` and `rules`, then the code, tests, and docs it touches (the code may live outside the OpenSpec root). Reuse what you find for later artifacts. If the code already does part of the request, say so and plan only the gap, which can be a spec update alone. If the target is unclear, ask. With no code yet, or none you can read, say so. Keep what you saw apart from what you assume, and raise conflicts with the specs rather than settling them quietly. Do this now, not as a task for later.
   - Write it as `references/writing-an-artifact.md` describes, show "✓ Created <artifact-id>", and re-run status: one artifact can unblock others.

   An artifact is finished when it is written or `skipped` (the change declares `skip_specs`, so its files must not exist). Skip any other only when its own `instruction`, read with `openspec instructions`, marks it optional, as spec-driven's design.md does; never skip specs by your own judgment. Say what you skipped and why, do not revisit it, and keep going: a skipped dependency does not block what comes after it.

   Stop when every artifact in the set is finished. If one needs input from the user (critically unclear context), ask, then continue. Otherwise prefer making reasonable decisions to keep momentum.


6. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

Summarize the change name and location, each artifact created (plus any conditional artifact you skipped and why), then: "All artifacts needed for implementation are ready. Run `/openspec-beta-apply` or ask me to implement to start working on the tasks."

**Guardrails**
- Create every artifact the apply phase transitively depends on, not just the ids listed in `apply.requires`
