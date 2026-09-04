import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { escapeRoff, renderManPage } from '../../../src/core/man/man-page.js';
import { program } from '../../../src/cli/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function render(command: Command): string {
  return renderManPage(command, { version: '9.9.9', date: '2026-01-01' });
}

function buildProgram(): Command {
  const command = new Command();
  command.name('openspec').description('test program').version('9.9.9');
  command.option('--no-color', 'Disable color output');

  command
    .command('archive')
    .description('Archive a completed change')
    .argument('[change-name]', 'Change to archive')
    .option('--skip-specs', 'Skip spec updates');

  const store = command.command('store').description('Manage stores');
  store.command('register').description('Register a store').argument('<path>', 'Store path');

  command.command('__complete', { hidden: true }).description('Internal');

  return command;
}

describe('renderManPage', () => {
  it('opens with a .TH header carrying the version and date', () => {
    expect(render(buildProgram()).split('\n')[0]).toBe(
      '.TH OPENSPEC 1 "2026\\-01\\-01" "openspec 9.9.9" "OpenSpec Manual"'
    );
  });

  it('escapes the version in the header, prereleases included', () => {
    const page = renderManPage(buildProgram(), { version: '2.0.0-beta.1', date: '2026-01-01' });

    expect(page.split('\n')[0]).toContain('"openspec 2.0.0\\-beta.1"');
  });

  it('documents each command as a subsection using its full invocation', () => {
    const page = render(buildProgram());

    expect(page).toContain('.SS openspec archive [options] [change\\-name]');
    expect(page).toContain('Archive a completed change');
    expect(page).toContain('\\fB\\-\\-skip\\-specs\\fR');
  });

  it('flattens nested subcommands under their full command path', () => {
    const page = render(buildProgram());

    expect(page).toContain('.SS openspec store [options] [command]');
    expect(page).toContain('.SS openspec store register [options] <path>');
  });

  it('documents arguments that carry a description', () => {
    const page = render(buildProgram());

    expect(page).toContain('\\fBchange\\-name\\fR');
    expect(page).toContain('Change to archive');
  });

  it('omits hidden commands, which the CLI does not advertise either', () => {
    expect(render(buildProgram())).not.toContain('__complete');
  });

  it('documents --help once, not on all 40 commands', () => {
    const page = render(buildProgram());

    expect(page.match(/\\fB\\-h, \\-\\-help\\fR/g)).toHaveLength(1);
    expect(page).toContain('Accepted by every command.');
  });

  it('omits the implicit help command, which OPTIONS already covers', () => {
    expect(render(buildProgram())).not.toContain('.SS openspec help');
  });

  it('keeps a multi-line description on one roff line', () => {
    const command = new Command();
    command.name('openspec').description('test program');
    command
      .command('demo')
      .description('first line\nsecond line')
      .option('--wrapped <value>', 'flag help\n  continued here');

    const page = render(command);

    expect(page).toContain('first line second line');
    expect(page).toContain('flag help continued here');
  });

  it('keeps an undescribed option well-formed', () => {
    const command = new Command();
    command.name('openspec').description('test program');
    command.command('demo').description('Demo').option('--quiet');

    expect(render(command)).toContain('.TP\n\\fB\\-\\-quiet\\fR\n\\&\n');
  });

  it('ends with a trailing newline so the page is a well-formed text file', () => {
    expect(render(buildProgram()).endsWith('\n')).toBe(true);
  });

  it('is deterministic for the same inputs', () => {
    expect(render(buildProgram())).toBe(render(buildProgram()));
  });
});

describe('escapeRoff', () => {
  it('escapes hyphens so flags stay copy-pastable', () => {
    expect(escapeRoff('--skip-specs')).toBe('\\-\\-skip\\-specs');
  });

  it('escapes backslashes so Windows paths do not start roff sequences', () => {
    expect(escapeRoff('C:\\Users')).toBe('C:\\eUsers');
  });
});

describe('a line that would be read as a roff macro', () => {
  it('is neutralized with a zero-width escape', () => {
    const command = new Command();
    command.name('openspec').description('test program');
    command.command('demo').description(".openspec/ holds the config");

    expect(render(command)).toContain('\\&.openspec/ holds the config');
  });
});

describe('the manual rendered from the real CLI', () => {
  const page = render(program);

  it('covers commands from every level of the real command tree', () => {
    expect(page).toContain('.SS openspec init');
    expect(page).toContain('.SS openspec archive');
    expect(page).toContain('.SS openspec store register');
    expect(page).toContain('.SS openspec new change');
  });

  it('carries real flags, so the page cannot drift from --help', () => {
    expect(page).toContain('\\fB\\-\\-skip\\-specs\\fR');
    expect(page).toContain('\\fB\\-\\-json\\fR');
  });

  it('leaves out the CLI internals the help output hides', () => {
    expect(page).not.toContain('__complete');
    expect(page).not.toContain('.SS openspec experimental');
  });
});

describe('packaging', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')
  );

  it('registers the generated page so npm installs it as a man page', () => {
    expect(packageJson.man).toEqual(['./dist/man/openspec.1']);
  });

  it('publishes the directory the page is generated into', () => {
    // The page lives under dist/, so `files` already carries it; an exclusion
    // pattern would silently ship a package with no manual.
    expect(packageJson.files).toContain('dist');
    expect(
      (packageJson.files as string[]).some((pattern) => pattern.startsWith('!dist/man'))
    ).toBe(false);
  });
});
