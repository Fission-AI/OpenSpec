import { SlashCommandConfigurator } from "./base.js";
import { SlashCommandId } from "../../templates/index.js";

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: ".kilocode/workflows/openspec-proposal.md",
  apply: ".kilocode/workflows/openspec-apply.md",
  refine: ".kilocode/workflows/openspec-refine.md",
  archive: ".kilocode/workflows/openspec-archive.md"
};

export class KiloCodeSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = "kilocode";
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(_id: SlashCommandId): string | undefined {
    return undefined;
  }
}
