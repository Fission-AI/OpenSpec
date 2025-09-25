import { SlashCommandConfigurator } from "./base.js";
import { SlashCommandId } from "../../templates/index.js";

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: ".opencode/command/openspec-proposal.md",
  apply: ".opencode/command/openspec-apply.md",
  archive: ".opencode/command/openspec-archive.md",
};

const FRONTMATTER: Record<SlashCommandId, string> = {
  proposal: `---
agent: build
description: Scaffold a new OpenSpec change and validate strictly.
---
The user has requested the following change proposal. Use the openspec instructions to create their change proposal.
<UserRequest>
  $ARGUMENTS
</UserRequest>
`,
  apply: `---
agent: build
description: Implement an approved OpenSpec change and keep tasks in sync.
---`,
  archive: `---
agent: build
description: Archive a deployed OpenSpec change and update specs.
---`,
};

export class OpenCodeSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = "opencode";
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string | undefined {
    return FRONTMATTER[id];
  }
}
