# Lifecycle checkpoints: the first pilot

**Status:** Proposed design. The commands and configuration below are not implemented.

The existing integration already turns product requirements into OpenSpec changes. We're adding two points around that workflow: check the source before implementation, and offer a feedback review when implementation finishes.

A skill or CLI command invokes each point explicitly. OpenSpec runs the configured checks and returns any optional reviews. The developer chooses whether to run a review. Generation and the artifact workflow stay as they are.

The [launch post](lifecycle-checkpoints-launch.md) shows the experience we're building toward. This design covers the small piece we can try first.

## One change, from start to finish

An engineer generates an OpenSpec change for the iOS checkout flow using their existing skill. The upstream requirements stay in their original repository.

Before implementation starts, the Apply skill calls:

```bash
openspec lifecycle check --at apply.before --change ios-checkout --json
```

OpenSpec finds the actions configured for that event and runs the source-drift check. If the source content changed since the recorded baseline, the skill shows the finding with its requirement impact still unassessed. If it couldn't check them, it explains why. The developer decides whether to review the source before continuing.

The skill then works through its tasks as usual. When it confirms they're complete, it calls:

```bash
openspec lifecycle check --at apply.completed --change ios-checkout --json
```

OpenSpec returns an available review. The agent might say:

> Implementation tasks are complete. Want me to review the work for findings worth sending to the upstream product team?

If the developer chooses it, the skill loads the instructions:

```bash
openspec actions instructions upstream-feedback --change ios-checkout --json
```

The current agent reads the requirements, implementation decisions, and available evidence, then drafts feedback. It doesn't submit feedback or change upstream requirements without separate approval. If the developer skips the review, nothing runs and no check becomes failed or pending.

The lifecycle call is synchronous: run the configured work at this point and return its results to the caller. It is an operational call used by the skill, not a background event notification or a testing-only interface. The selected command is `openspec lifecycle check --at <point>`. It runs configured automatic checks and returns optional actions; it does not advance the workflow or perform suggested reviews. The command is not implemented yet.

The separate instruction-loading call above is one option, not a settled two-operation API. We still need to decide whether an agent action maps to an existing skill, whether its instructions are returned directly, or whether a separate lookup is useful.

## Configure what happens

An **action** says what to do. A **trigger** connects it to a lifecycle event.

```yaml
# Proposed openspec/config.yaml additions
actions:
  source-drift:
    uses: builtin/git-file-drift
  upstream-feedback:
    uses: agent-guidance
    title: Review implementation feedback
    description: Find decisions or evidence worth sharing upstream.
    instructions: |
      Review the recorded requirements, implementation decisions,
      and verification evidence for this change.
      Draft feedback with source references and mark uncertainty.
      Do not change upstream requirements or submit feedback
      without separate approval.

triggers:
  - on: apply.before
    run: source-drift
    mode: auto
    policy: warn
  - on: apply.completed
    run: upstream-feedback
    mode: suggest
```

Keep `mode` and `policy` explicit. **Mode** controls whether an action runs automatically or is offered for the developer to choose. **Policy** controls how an executed check's findings affect the workflow, such as warning or blocking. Neither should be inferred solely from the action kind.

The examples use automatic checks with warnings and suggested agent reviews. They do not remove the flexibility to configure the same action differently at another lifecycle point. A suggestion has no passing or failing result until work runs; policy must not turn an optional suggestion into a required review. Valid combinations, execution support, and unknown/error handling still need to be defined. Real blocking is possible only where the caller controls the operation.

Validate action references and reject unsupported kinds or duplicate IDs. When nothing is enabled, the existing workflow continues without extra prompts.

## What callers receive

An event response separates check findings from review suggestions. For example, before Apply:

```json
{
  "findings": [
    {
      "actionId": "source-drift",
      "sourceId": "checkout-requirements",
      "result": "changed",
      "message": "Source content changed; requirement impact has not been assessed.",
      "evidence": {
        "baselineRevision": "6a81f32",
        "comparedRevision": "9b02e17"
      }
    }
  ],
  "suggestedActions": []
}
```

After Apply, the response contains a suggestion with an action ID, title, and short description. The instruction call returns the selected action's text; it doesn't launch an agent. Offering a review, loading its instructions, and completing it are not check results.

The Git check reports `unchanged`, `changed`, or `unknown`, with a reason and the revisions it could compare. Unknown never means unchanged. Invalid configuration or a failed command produces a visible error, not a clean result. An unknown or disabled review cannot be loaded. A successful event call means the call completed, not that the implementation passed verification.

Keep the response small. Settle the exact envelope, instruction handoff, and error encoding while walking through the skill and CLI callers; the pilot does not need approval records or stored review state.

## Use the same interface everywhere

Built-in skills and custom skills synchronously run the same named lifecycle points. Each calls once when starting or resuming Apply and once when it confirms its tracked tasks are complete. If a custom wrapper delegates to the built-in skill, choose one of them to make the call.

**Instruction and status reads must not run actions.** Apply refreshes its instructions during the task loop. Attaching checks to those reads would repeat warnings and review offers. An explicit repeat of the lifecycle call runs the actions again; the pilot doesn't promise exactly-once delivery across sessions.

If a final source warning is useful, add `archive.before`. The Archive CLI calls the same internal function before its existing operation. Running that lifecycle point manually does not archive anything, and the pilot leaves existing archive validation and confirmation behavior intact.

Agent-driven lifecycle points happen only when a skill calls the interface. OpenSpec cannot observe every agent edit. CLI operations can enforce a configured policy at boundaries they own. The initial examples warn; broader policy behavior remains part of the design.

A CLI can return instructions or an action reference, but it cannot make an agent execute them. When a skill calls the CLI, the skill can present suggestions and carry out an accepted review. In a terminal-only invocation, the CLI can show available actions; it must not pretend a review ran. Whether agent actions should all map to skills is an open design question. Deterministic checks do not need an agent to run.

## Keep source details with the check

The lifecycle interface needs an event and a change. The Git action needs four things: an existing checkout, a file path, the revision used for planning, and a ref to compare against.

Capture the source identity and exact version when the generation skill reads it, then save the reference when the developer accepts the generated change. The skill can prepare the record or a follow-up step can use the captured read details. Do not reread the latest source at Apply and present it as the planning baseline. Add later sources when the developer accepts their use.

If an existing change has no recoverable planning baseline, report historical comparison as unknown. The developer can explicitly establish a new tracking baseline, clearly labeled as starting now rather than evidence of the original plan. Keep the earlier baseline in history whenever a new one is accepted.

Record the source on the change itself, in `openspec/changes/<change-name>/.openspec.yaml`. Here is the proposed `sources` field; it is not supported by the current implementation:

```yaml
# openspec/changes/ios-checkout/.openspec.yaml — proposed
schema: spec-driven
sources:
  - id: checkout-requirements
    type: git-file
    repository: https://github.com/example/product-requirements.git
    path: features/checkout.md
    revision: 6a81f32
    track: main
```

`id` identifies the source within the change. `type` selects the source kind. `repository` and `path` identify the file; `revision` pins the version used for planning or an explicitly accepted later baseline; `track` names the branch to compare against. The short revision is illustrative. The Git check resolves it to a commit and reports the exact revisions compared.

This is change-specific metadata, separate from project-level Store `references:`. The repository URL identifies the source; it does not authorize a clone or fetch. The integration still needs to resolve an accessible checkout. Recording a source does not copy its requirements into local specs or change their owner.

Inspect what the integration already records before choosing the source contract. Reusing that data is a possibility, not a decision to rule out generic source metadata. Preserve generation; decide whether an adapter or a small shared source record gives lifecycle actions reliable inputs. If a baseline is missing, report unknown; never use the current file as a guessed historical baseline.

Compare that file's contents, not just repository commit IDs. An unrelated commit should not produce drift. The proposed pilot uses local refs and does not clone or fetch implicitly. Report that freshness limit and the revisions compared; a local comparison doesn't establish the latest remote state. Missing files, checkouts, or revisions remain unknown.

A change may also link to a Confluence page, Linear issue, Jira ticket, or repository issue. Keep those sources in the same proposed `sources` list using a link record; see the [source examples](lifecycle-checkpoints-launch.md#sources-outside-git) and [agent responses](lifecycle-checkpoints-launch.md#4-what-your-agent-sees). The `link` record shape is illustrative, not a finalized provider API.

The Git action cannot check those services. A link alone supplies neither access nor a historical baseline. An authorized agent can review current content, while automatic drift comparison needs a provider integration and recoverable history. Keep unsupported or unreadable sources visible as limitations; don't count them as checked. These examples leave the Git pilot's scope unchanged.

The check is read-only. Its `changed` result means source content differs, not that a requirement changed. Typos, formatting, unrelated sections, and unaccepted proposals can all produce source edits without changing this work's requirements.

Offer an impact review separately. If chosen, the agent compares the source versions with the accepted scope and available evidence, then reports no relevant requirement changes found, relevant changes found, or unclear. Cite the relevant passages and distinguish accepted requirements from discussion. A relevant change may already be satisfied by the implementation.

The developer decides whether to continue, revise the work, clarify intent, or propose feedback. Skipping the review leaves impact unassessed. Neither a check nor a review advances the baseline; that requires explicit acceptance. See [What your agent sees](lifecycle-checkpoints-launch.md#4-what-your-agent-sees) for the full flow and examples.

## Leave room for plugins without building the whole system

Reuse project configuration and OpenSpec's existing change/root resolution. Keep ordinary operation guidance and the artifact graph working as they do today. Add explicit calls to the Apply skill and, if included, the Archive command.

Keep loading enabled actions separate from running them. A simple lookup can serve built-ins and project guidance now. Later it can load independent plugins and shared team profiles without changing skill calls. Support namespaced IDs and reject collisions; don't build a package resolver, dependency graph, or profile-precedence system for the pilot.

The destination remains global plugin installation, project-level enablement, and versioned team profiles. Installing a plugin must not enable it everywhere or run code. Before external executable actions ship, define trust and execution limits. The initial pilot runs a built-in check and offers guidance to the current agent session.

## What proves it works

Try one real generated change through both the built-in skill and the existing custom workflow:

- The recorded revision matches the source actually read, even if it changes before plan acceptance.
- A source-file edit produces drift; an unrelated commit does not.
- Typo-only, unrelated, proposed, and accepted requirement edits remain distinct in the optional impact review.
- Skipping a review leaves impact unassessed and the baseline unchanged.
- An unavailable source produces an honest unknown result.
- The developer can accept or skip the review without changing check status.
- Instruction refreshes don't repeat checks or prompts.
- Checks leave sources, recorded baselines, and the generation workflow unchanged.
- A project with no enabled actions keeps its existing behavior.

We haven't inspected the private skills yet. Mapping their call sites and source metadata is the next integration step, not a reason to settle the whole plugin or event system first.

See the [roadmap](../direction/roadmap.md) for the sequence and the [enterprise requirements inventory](../research/enterprise-requirements.md) for wider needs. External-contract generation and verification remain separate exploration; they don't gate this pilot.
