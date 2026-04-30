import { describe, expect, it } from 'vitest';
import { Command } from 'commander';
import { registerWorkspaceCommand } from '../../../src/commands/workspace.js';

function getWorkspaceCommand(): Command {
  const program = new Command();
  registerWorkspaceCommand(program);

  const workspaceCommand = program.commands.find((command) => command.name() === 'workspace');
  if (!workspaceCommand) {
    throw new Error('workspace command was not registered');
  }

  return workspaceCommand;
}

describe('workspace help metadata', () => {
  it('documents cross-repo planning and repo guidance commands in help output', () => {
    const workspaceCommand = getWorkspaceCommand();
    const listCommand = workspaceCommand.commands.find((command) => command.name() === 'list');
    const setupCommand = workspaceCommand.commands.find((command) => command.name() === 'setup');
    const addRepoCommand = workspaceCommand.commands.find((command) => command.name() === 'add-repo');
    const updateRepoCommand = workspaceCommand.commands.find((command) => command.name() === 'update-repo');
    const targetsCommand = workspaceCommand.commands.find((command) => command.name() === 'targets');
    const openCommand = workspaceCommand.commands.find((command) => command.name() === 'open');

    expect(workspaceCommand.description()).toBe('Manage OpenSpec workspaces for cross-repo planning');
    expect(workspaceCommand.helpInformation()).toContain('list|ls [options]');
    expect(workspaceCommand.helpInformation()).toContain('setup [options]');
    expect(workspaceCommand.helpInformation()).toContain('create [options] <name>');
    expect(workspaceCommand.helpInformation()).toContain('update-repo [options] <alias>');
    expect(workspaceCommand.helpInformation()).toContain('targets [options] <change>');

    expect(listCommand?.description()).toBe('List locally managed OpenSpec workspaces');
    expect(listCommand?.helpInformation()).toContain('--json');

    expect(setupCommand?.description()).toBe('Interactively create a workspace and register repos');
    expect(setupCommand?.helpInformation()).toContain('--no-interactive');

    expect(addRepoCommand?.description()).toBe(
      'Register a repo alias in the current workspace, with optional owner or handoff guidance'
    );
    expect(addRepoCommand?.helpInformation()).toContain('--owner <name>');
    expect(addRepoCommand?.helpInformation()).toContain('--handoff <note>');

    expect(updateRepoCommand?.description()).toBe(
      'Record or update owner or handoff guidance for a registered repo alias'
    );
    expect(updateRepoCommand?.helpInformation()).toContain('--owner <name>');
    expect(updateRepoCommand?.helpInformation()).toContain('--handoff <note>');

    expect(targetsCommand?.description()).toBe(
      'Add or remove target aliases for an existing workspace change'
    );
    expect(targetsCommand?.helpInformation()).toContain('--add <aliases>');
    expect(targetsCommand?.helpInformation()).toContain('--remove <aliases>');

    expect(openCommand?.description()).toBe(
      'Open a workspace-root or change-scoped session for the current or selected managed workspace'
    );
    expect(openCommand?.helpInformation()).toContain('--name <workspace>');
    expect(openCommand?.helpInformation()).toContain('--prepare-only');
    expect(openCommand?.helpInformation()).toContain('--no-interactive');
  });
});
