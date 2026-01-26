# OpenSpec 1.0 Twitter Thread

### 1 - Opener

We just shipped OpenSpec 1.0!

We've taken what we've learned from months of feedback and put it into one release.

Here's what's new 👇

[Image]

---

### 2 - Skills Support

We've fully migrated to Skills.

Before skills were a thing, we were hacking it - injecting a note into CLAUDE.md or AGENTS.md telling AI this project runs on OpenSpec.

Now we generate proper skills for 21 coding agents: Claude Code, Cursor, Windsurf, Codex, GitHub Copilot, Amazon Q, and 15 more.

---

### 3 - New Explore Command

Think through an idea before committing to a change.

Investigate the codebase. Compare approaches. Clarify requirements.

When ready, flow into /opsx:new.

[Screenshot: /opsx:explore how should we add real-time notifications?]

---

### 4 - FF vs Continue

Two ways to create planning artifacts:

ff creates all artifacts at once - proposal, specs, design, tasks.
continue creates one artifact at a time.

ff when you have a clear picture. continue when you're still learning.

[Screenshot: /opsx:ff add-dark-mode and /opsx:continue add-dark-mode]

---

### 5 - New Verify Command

Checks that what you built matches what you planned.

• Completeness - all tasks done?
• Correctness - all requirements implemented?
• Coherence - code follows the design?

Run before you archive.

[Screenshot: /opsx:verify add-dark-mode]

---

### 6 - Dynamic Instructions

AI instructions are no longer static.

Assembled from 3 layers:
• Context - your project background
• Rules - artifact-specific constraints
• Template - output structure

Edit any layer. Changes take effect immediately.

---

### 7 - Plus More

Plus:
• Custom schemas - define your own artifact workflows
• Project config - openspec/config.yaml for context + rules
• Bulk archive - /opsx:bulk-archive for parallel changes

Full docs: github.com/Fission-AI/OpenSpec/blob/main/docs/

---

### 8 - Onboard Command

New to OpenSpec?

Guided walkthrough of the full workflow using your actual codebase.

~15 minutes to see it all in action.

[Screenshot: /opsx:onboard]

---

### 9 - Install

Upgrade or install:

[Screenshot: npx @fission-ai/openspec@latest init]

Release notes: github.com/Fission-AI/OpenSpec/releases/tag/v1.0.0

Questions? Find me here or on the OpenSpec Discord.
