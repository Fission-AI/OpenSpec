---
name: openspec-new-change
description: Start a new OpenSpec change using the experimental artifact workflow. Use when the user wants to create a new feature, fix, or modification with a structured step-by-step approach.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Start a new change using the experimental artifact-driven approach.

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`, `view`). Once selected, treat `--store <id>` as sticky for the rest of the workflow. Every unscoped example of those commands below is shorthand: before running it, append the flag. For example, run `openspec status --change "<name>" --json --store "<id>"`, not the unscoped form shown below. Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Input**: The user's request should include a change name (kebab-case) OR a description of what they want to build.

**Steps**

1. **If no clear input provided, ask what they want to build**

   Ask the user (open-ended, no preset options):
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → `add-user-auth`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Select and confirm the workflow schema**

   Before creating the change, determine the schema as follows:

   - If the user explicitly names a schema, use it and treat that choice as confirmed. If they also explicitly ask you to confirm it, stop and wait for confirmation.
   - Otherwise, resolve the authoritative root by running `openspec context --json` from the current working directory. If the user explicitly selected a registered store, use `openspec context --json --store "<store-id>"`. Then run `openspec schemas --json` with its working directory set to the returned `root.path` and inspect each schema's `name`, `description`, and `artifacts`. This preserves roots selected by a local `store:` pointer or the global `defaultStore`; `schemas` does not accept `--store`. If context reports only `no_openspec_root`, run `openspec schemas --json` from the current working directory instead. Do not use this fallback for invalid or unavailable stores.
   - Use `description` as the authority for matching the request. Use `name` and `artifacts` only to identify, display, and explain candidates.
   - Select a schema only when exactly one is a clear match.
     - Normally, present the recommendation and a concise reason, then stop and wait for confirmation.
     - Skip that confirmation only when the user's current request or the selected schema's description clearly and unambiguously says no further confirmation is needed.
     - If the user explicitly asks for confirmation, always wait even if the selected schema's description waives it.
   - If no unique recommendation is possible, stop before creating the change, list the relevant candidates with their descriptions, and ask the user to choose. Never silently use the default schema.
   - If the user rejects a recommendation, stop and list the relevant candidates so they can choose.
   - If root resolution or `openspec schemas --json` fails, cannot be parsed, or returns no schemas, stop and report the problem. Do not fall back to the default.
   - After the user selects a listed candidate, treat that choice as confirmed.

   Do not continue until one schema is confirmed or confirmation has been clearly waived. Use the selected schema name in the create command below.

3. **Create the change directory**
   ```bash
   openspec new change "<name>" --schema "<schema-name>"
   ```
   Here, `<schema-name>` is the confirmed selection, or the unique recommendation whose confirmation was clearly waived.
   This creates a scaffolded change in the planning home resolved by the CLI.

4. **Show the artifact status**
   ```bash
   openspec status --change "<name>" --json
   ```
   Use the returned `planningHome`, `changeRoot`, `artifactPaths`, and `nextSteps` instead of assuming repo-local paths.

5. **Get instructions for the first artifact**
   The first artifact depends on the schema (e.g., `proposal` for spec-driven).
   Check the status output to find the first artifact with status "ready".
   ```bash
   openspec instructions <first-artifact-id> --change "<name>"
   ```
   This outputs the template and context for creating the first artifact.

6. **STOP and wait for user direction**

**Output**

After completing the steps, summarize:
- Change name and location
- Schema/workflow being used and its artifact sequence
- Current status (0/N artifacts complete)
- The template for the first artifact
- Prompt: "Ready to create the first artifact? Just describe what this change is about and I'll draft it, or ask me to continue."

**Guardrails**
- Do NOT create any artifacts yet - just show the instructions
- Do NOT advance beyond showing the first artifact template
- If the name is invalid (not kebab-case), ask for a valid name
- If a change with that name already exists, suggest continuing that change instead
- Always pass the selected schema with `--schema`
