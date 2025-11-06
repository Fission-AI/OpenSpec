import { SlashCommandConfigurator } from "./base.js";
const FILE_PATHS = {
    proposal: ".kilocode/workflows/openspec-proposal.md",
    apply: ".kilocode/workflows/openspec-apply.md",
    archive: ".kilocode/workflows/openspec-archive.md"
};
export class KiloCodeSlashCommandConfigurator extends SlashCommandConfigurator {
    toolId = "kilocode";
    isAvailable = true;
    getRelativePath(id) {
        return FILE_PATHS[id];
    }
    getFrontmatter(_id) {
        return undefined;
    }
}
//# sourceMappingURL=kilocode.js.map