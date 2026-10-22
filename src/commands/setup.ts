import * as fs from 'node:fs';
import * as path from 'node:path';

import { formatMachineRevert, formatMachineSetup, revertMachineSetup, setupMachine } from '../core/machine-setup.js';

export interface SetupOptions {
  dryRun?: boolean;
  json?: boolean;
  revert?: boolean;
}

export class SetupCommand {
  async execute(options: SetupOptions = {}): Promise<void> {
    if (options.revert) {
      const reverted = await revertMachineSetup();
      console.log(options.json ? JSON.stringify(reverted, null, 2) : formatMachineRevert(reverted));
      if (reverted?.error) process.exitCode = 1;
      return;
    }
    // Run inside an OpenSpec project, setup also moves that project's older skills.
    const cwd = process.cwd();
    const projectPath = fs.existsSync(path.join(cwd, 'openspec')) ? cwd : undefined;
    const result = await setupMachine({ dryRun: options.dryRun, migrate: true, projectPath });
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatMachineSetup(result, { dryRun: options.dryRun }));
    }
    if (!options.dryRun && result.claudePlugin && !result.claudePlugin.registered) {
      process.exitCode = 1;
    }
  }
}
