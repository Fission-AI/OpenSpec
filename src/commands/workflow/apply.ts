import { applyWorkspaceChange, type ApplyWorkspaceChangeResult } from '../../core/workspace/apply.js';

export interface ApplyCommandOptions {
  change?: string;
  repo?: string;
  json?: boolean;
}

function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

function printApplyReport(result: ApplyWorkspaceChangeResult): void {
  console.log(`Materialized workspace change '${result.change.id}' into repo '${result.target.alias}'.`);
  console.log(`Workspace root: ${result.workspaceRoot}`);
  console.log(`Workspace change: ${result.change.path}`);
  console.log(`Repo root: ${result.target.repoRoot}`);
  console.log(`Repo-local change: ${result.target.changePath}`);
  console.log(`Trace metadata: ${result.target.tracePath}`);
  console.log('Workspace planning artifacts remain intact.');
  console.log(
    `Authority handoff: ${result.authority.before} before apply; ${result.authority.after} after apply.`
  );
}

export async function applyCommand(options: ApplyCommandOptions): Promise<void> {
  if (!options.change) {
    throw new Error("Missing required option --change. Use 'openspec apply --change <id> --repo <alias>'.");
  }

  if (!options.repo) {
    throw new Error("Missing required option --repo. Use 'openspec apply --change <id> --repo <alias>'.");
  }

  const result = await applyWorkspaceChange({
    change: options.change,
    repo: options.repo,
  });

  if (options.json) {
    printJson(result);
    return;
  }

  printApplyReport(result);
}
