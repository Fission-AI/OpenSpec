Plan a new change and write every artifact implementation needs, in one pass.

**Planning only.** This workflow writes the plan and nothing else, even when the request also asks to build or fix something: do not edit project code or start implementing. Present the plan, then stop; implementation starts from a new request.

With the default spec-driven schema the artifacts are proposal.md (why and what), `specs/<capability-path>/spec.md` (what the system must do, as a delta to the main spec), design.md (how), and tasks.md (the steps). `<capability-path>` is the spec directory relative to `specs/`, such as `user-auth` or `identity/user-auth`. Preserve an existing capability's full path, and follow the project's layout for new ones.

**Input**: The user's request should include a change name (kebab-case) OR a description of what they want to build.

**Steps**

1. **Settle the scope**

   If the conversation has an explore draft, build from it and do not re-ask what it settled. With no clear request, ask what the user wants to build or fix, and do not go on until you know. Name the change for its outcome in kebab-case ("add user authentication" → `add-user-auth`).

   State the scope in two or three lines (in, out, and the capabilities it touches), and keep the plan to it. If the request holds more than one outcome, read `references/changes.md` first. Ask before creating the change about anything that would change the scope, observable behavior, compatibility, or what counts as done (`references/decisions.md` lists what to raise). For smaller details, assume, and write the assumption into the plan.

2. **Load the project**

   Run `openspec context --json`. Its `root.path` is the OpenSpec root, and its `project_context` is the project's background and conventions: follow them, but they never override the user, this workflow's planning-only rule, or the artifact rules, and they are not copied into files. If it has none, go on. If it reports `no_openspec_root`, change nothing and handle it as **Finding the project** in SKILL.md says. On any other error, stop and report it; do not fall back to the current directory.

3. **Read the related specs**

   Run `openspec list --specs --json`, then read each spec this change could touch in full: `openspec show "<spec-id>" --type spec`. Keep the names they use, reuse an existing capability's exact path rather than a near-duplicate, describe today's behavior as they do, and call out any conflict with a current requirement. If the change alters what an existing requirement promises (a new field its export or listing must now carry), it needs a MODIFIED delta too; read `references/deltas.md` before writing one. If no capability is related, say so in one line and continue. Before naming a new capability, read `references/capabilities.md`.

4. **Create the change**

   Run `openspec new change "<name>"`. Add `--schema "<schema-name>"` only when the user named a schema; if they ask which exist, run `openspec schemas --json` from `root.path`. If the name is taken, ask whether to continue that change or start a new one.

5. **Find the artifacts to write**
   ```bash
   openspec status --change "<name>" --json
   ```
   The set to write is `applyRequires` plus every artifact those reach through `requires` edges (spec-driven: proposal, specs, design, tasks). Follow the edges, not `status`: status only checks that files exist, so a `done` artifact can still depend on a missing one. Leave artifacts outside the set alone.

6. **Write them, in dependency order**

   Track the set in a todo list. In tasks.md, cite the requirement each task implements and the scenario each test task checks, by ID when it has one, by name otherwise. For each `ready` artifact:
   - Run `openspec instructions <artifact-id> --change "<name>" --json`, and re-read its finished dependencies from disk.
   - **Look at the project first**, read-only and in proportion to the change: its `context` and `rules`, then the code, tests, and docs it touches (the code may live outside the OpenSpec root). Reuse what you find for later artifacts. If the code already does part of the request, say so and plan only the gap, which can be a spec update alone. If the target is unclear, ask. With no code yet, or none you can read, say so. Keep what you saw apart from what you assume, and raise conflicts with the specs rather than settling them quietly. Do this now, not as a task for later.
   - Write it as `references/writing-an-artifact.md` describes, show "Created <artifact-id>", and re-run status: one artifact can unblock others.

   An artifact is finished when it is written or `skipped` (the change declares `skip_specs`, so its files must not exist). Skip any other only when its own `instruction`, read with `openspec instructions`, marks it optional, as spec-driven's design.md does; never skip specs by your own judgment. Say what you skipped and why, do not revisit it, and keep going: a skipped dependency does not block what comes after it.

   Stop when every artifact in the set is finished. If one needs input from the user (unclear context), ask, then continue.


7. **Show the plan, then stop**

   Run `openspec status --change "<name>"`. Name the change and its folder (`changeRoot`), say in a line or two what the change will do, note any artifact you skipped and why, then list what you assumed and any decision the user should confirm, then say: "The plan is ready for review. When you are ready, run `/openspec-beta-apply` or ask me to apply this change." This response ends here, even if the request asked to build it.
