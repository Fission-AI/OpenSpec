## 1. Update README workflow commands and branding

- [x] 1.1 Replace the tip callout (lines 37-39) to reference `/enpalspec:propose` and the enpalspec workflow instead of `/opsx:propose`
- [x] 1.2 Update the "See it in action" code block to use `/enpalspec:propose`, `/enpalspec:apply`, and `/enpalspec:archive`
- [x] 1.3 Update the Quick Start prompt (line 101) from `/opsx:propose` to `/enpalspec:propose`
- [x] 1.4 Remove or update the mention of the expanded workflow opsx commands (line 103: `/opsx:new`, `/opsx:continue`, etc.) to reflect enpalspec equivalents or remove if not applicable
- [x] 1.5 Add a shoutout line crediting OpenSpec as the upstream base (e.g., in the footer or a dedicated note near the top)

## 2. Fix welcome screen (src/ui/welcome-screen.ts)

- [x] 2.1 Change "Welcome to OpenSpec" (line 20) to "Welcome to enpalspec"
- [x] 2.2 Change "Agent Skills for AI tools" bullet and `/opsx:* slash commands` (line 25) to `/enpalspec:* slash commands`
- [x] 2.3 Replace the quick-start command list (lines 28-30) — swap `/opsx:new` → `/enpalspec:propose`, remove `/opsx:continue`, update `/opsx:apply` → `/enpalspec:apply`

## 3. Fix init success output (src/core/init.ts)

- [x] 3.1 Change "OpenSpec Setup Complete" (line 640) to "enpalspec Setup Complete"
- [x] 3.2 Change "OpenSpec configured:" (line 326) to "enpalspec configured:"
- [x] 3.3 Decide and update the learn-more and feedback links (lines 716-717): remove upstream Fission-AI/OpenSpec links or replace with enpalspec equivalents

## 4. Further README cleanup

- [x] 4.1 Remove the stars, downloads, contributors `<details>` block (lines 17-24)
- [x] 4.2 Remove the Discord badge from the badges row (line 14)
- [x] 4.3 Update the tip callout and "See it in action" example to start with `/enpalspec:explore` before `/enpalspec:propose`
- [x] 4.4 Update npm install command in Quick Start and Updating sections from `@fission-ai/openspec@latest` to `@enpal/enpalspec@latest`
