import { SlashCommandConfigurator } from "./base.js";
import { FileSystemUtils } from "../../../utils/file-system.js";
import { OPENSPEC_MARKERS } from "../../config.js";
const FILE_PATHS = {
    proposal: ".opencode/command/openspec-proposal.md",
    apply: ".opencode/command/openspec-apply.md",
    archive: ".opencode/command/openspec-archive.md",
};
const FRONTMATTER = {
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
---
The user has requested to implement the following change proposal. Find the change proposal and follow the instructions below. If you're not sure or if ambiguous, ask for clarification from the user.
<UserRequest>
  $ARGUMENTS
</UserRequest>
`,
    archive: `---
agent: build
description: Archive a deployed OpenSpec change and update specs.
---
<ChangeId>
  $ARGUMENTS
</ChangeId>
`,
};
export class OpenCodeSlashCommandConfigurator extends SlashCommandConfigurator {
    toolId = "opencode";
    isAvailable = true;
    getRelativePath(id) {
        return FILE_PATHS[id];
    }
    getFrontmatter(id) {
        return FRONTMATTER[id];
    }
    async generateAll(projectPath, _openspecDir) {
        const createdOrUpdated = await super.generateAll(projectPath, _openspecDir);
        await this.rewriteArchiveFile(projectPath);
        return createdOrUpdated;
    }
    async updateExisting(projectPath, _openspecDir) {
        const updated = await super.updateExisting(projectPath, _openspecDir);
        const rewroteArchive = await this.rewriteArchiveFile(projectPath);
        if (rewroteArchive && !updated.includes(FILE_PATHS.archive)) {
            updated.push(FILE_PATHS.archive);
        }
        return updated;
    }
    async rewriteArchiveFile(projectPath) {
        const archivePath = FileSystemUtils.joinPath(projectPath, FILE_PATHS.archive);
        if (!await FileSystemUtils.fileExists(archivePath)) {
            return false;
        }
        const body = this.getBody("archive");
        const frontmatter = this.getFrontmatter("archive");
        const sections = [];
        if (frontmatter) {
            sections.push(frontmatter.trim());
        }
        sections.push(`${OPENSPEC_MARKERS.start}\n${body}\n${OPENSPEC_MARKERS.end}`);
        await FileSystemUtils.writeFile(archivePath, sections.join("\n") + "\n");
        return true;
    }
}
//# sourceMappingURL=opencode.js.map