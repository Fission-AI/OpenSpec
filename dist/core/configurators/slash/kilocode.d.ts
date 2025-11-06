import { SlashCommandConfigurator } from "./base.js";
import { SlashCommandId } from "../../templates/index.js";
export declare class KiloCodeSlashCommandConfigurator extends SlashCommandConfigurator {
    readonly toolId = "kilocode";
    readonly isAvailable = true;
    protected getRelativePath(id: SlashCommandId): string;
    protected getFrontmatter(_id: SlashCommandId): string | undefined;
}
//# sourceMappingURL=kilocode.d.ts.map