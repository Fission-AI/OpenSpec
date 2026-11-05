# Lifecycle extensibility roadmap

**Status:** Agreed scope; proposed delivery plan. No dates committed.

Keep the existing requirements-to-change workflow. Give built-in skills, custom skills, and CLI operations the same way to run checks and offer useful next steps.

The [lifecycle guide draft](../lifecycle/guide-draft.md) shows where we want to end up. Start with the [small pilot](../lifecycle/design-draft.md), then use what we learn to extend it.

## 1. Walk through the existing skills

Find where the custom workflow starts Apply and knows its tasks are complete. Check what source identity and revision it already records. Capture the version actually read and save it when the developer accepts the generated change. Map those inputs to the proposed API without rebuilding generation.

Agree only the contracts needed for that walkthrough: how callers run a lifecycle point synchronously, how a check reports its result, and how an accepted review reaches the agent. Decide whether reviews map directly to skills or need a separate instruction lookup; the two-operation API and reuse of source metadata are proposals, not settled constraints.

## 2. Build one useful loop

Before Apply, compare the source file with the recorded baseline. Report content changes or explain why it couldn't be checked. Offer a separate impact review: an edit may be a typo, unrelated to this work, or a proposal rather than an accepted requirement. The developer decides what needs updating; the baseline never advances silently.

After Apply, offer to review the implementation for feedback to the upstream product team. Let the developer run it or skip it. An accepted review drafts feedback in the current agent session; it never submits anything automatically.

Try both the built-in skill and the existing custom workflow. If a final source warning helps, add it before Archive through the same interface. Use warnings for the first examples, retain explicit mode and policy settings, and preserve existing validation and confirmation behavior.

## 3. Learn from use

Check whether warnings arrive at useful moments, whether reviews help, and whether repeated calls create noise. Try a second independent action. Add events or policies when a real workflow needs them.

A skill must explicitly invoke an event. The CLI can enforce behavior only inside operations it owns. Neither gives us automatic visibility into every agent action.

## 4. Make it easy to share

Build toward independent plugins, global installation, project-level enablement, and versioned team profiles. Keep action lookup separate from event execution now, so these can arrive without changing skill calls.

Before running third-party code, define trust and execution limits. Installing a plugin must not enable it everywhere or run its code. Multiple plugins should coexist without overwriting one another.

We don't need the complete installer, profile rules, event catalog, or policy engine to ship the pilot.

## Keep separate

External-contract generation and verification remain [broader exploration](external-context-for-changes.md), not pilot requirements. Projects, background observers, scheduling, action chains, and managed agent runs can wait for demonstrated need.

This roadmap accompanies a draft proposal; it does not authorize feature implementation.
