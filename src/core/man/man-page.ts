/**
 * Man page generation.
 *
 * The page is rendered from the live commander program, so `man openspec` and
 * `openspec --help` can never disagree: a command, flag, or description added
 * to the CLI shows up in the manual without anyone editing it here.
 */

import type { Command, Option, Argument } from 'commander';

export interface ManPageOptions {
  /** Package version, rendered in the page footer. */
  version: string;
  /** Page date (YYYY-MM-DD), rendered in the page footer. */
  date: string;
}

/**
 * Commander lists `-h, --help` on every command. Repeating it 40 times buries
 * the flags that differ, so it is documented once in OPTIONS instead.
 */
const HELP_OPTION_FLAGS = '-h, --help';

/**
 * `help [command]` duplicates `--help`, which OPTIONS already covers.
 */
const HELP_COMMAND_NAME = 'help';

const DESCRIPTION = [
  'OpenSpec keeps a project\'s intent in version-controlled specs and drives change through proposals that an AI coding assistant reads and executes.',
  'The commands below are the terminal half of that workflow: they set a project up, report where a change stands, and validate, show, and archive the artifacts. The planning workflows themselves (/opsx:propose, /opsx:apply, and the rest) run inside your assistant.',
];

const SEE_ALSO = [
  'Full CLI reference: https://openspec.dev/docs/cli',
  'Project home: https://github.com/Fission-AI/OpenSpec',
];

/**
 * Escape text for roff.
 *
 * Backslashes start escape sequences, and an unescaped hyphen renders as a
 * typographic minus that breaks copy-paste of flags.
 *
 * One pass, not a chain of replaces: escaping in two passes would let the
 * second pass rewrite backslashes the first one just produced.
 */
export function escapeRoff(text: string): string {
  return text.replace(/[\\-]/g, (character) => (character === '\\' ? '\\e' : '\\-'));
}

/**
 * Collapse a description onto one source line. A raw newline would end the
 * roff line mid-sentence and hand the rest to the formatter as new input.
 */
function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Emit a text line. A line whose first character is `.` or `'` would be read
 * as a macro, so it is prefixed with the zero-width `\&`.
 */
function textLine(text: string): string {
  const escaped = escapeRoff(text);
  return /^[.']/.test(escaped) ? `\\&${escaped}` : escaped;
}

function bold(text: string): string {
  return `\\fB${escapeRoff(text)}\\fR`;
}

function definition(term: string, description: string): string[] {
  const body = oneLine(description);
  // `\&` is a zero-width character: it keeps the entry well-formed when an
  // option carries no description.
  return ['.TP', bold(oneLine(term)), body.length > 0 ? textLine(body) : '\\&'];
}

function visibleOptions(command: Command): Option[] {
  const helper = command.createHelp();
  return helper
    .visibleOptions(command)
    .filter((option) => option.flags !== HELP_OPTION_FLAGS);
}

function visibleArguments(command: Command): Argument[] {
  return command.createHelp().visibleArguments(command);
}

function visibleSubcommands(command: Command): Command[] {
  const helper = command.createHelp();
  return helper
    .visibleCommands(command)
    .filter((sub) => sub.name() !== HELP_COMMAND_NAME);
}

/**
 * Depth-first walk of the command tree in registration order, so the manual
 * lists commands in the same order as `openspec --help`.
 */
function flattenCommands(command: Command): Command[] {
  const flattened: Command[] = [];
  for (const sub of visibleSubcommands(command)) {
    flattened.push(sub, ...flattenCommands(sub));
  }
  return flattened;
}

function renderCommand(command: Command): string[] {
  const helper = command.createHelp();
  const lines = ['.SS ' + escapeRoff(helper.commandUsage(command))];

  const description = oneLine(command.description());
  if (description) {
    lines.push(textLine(description));
  }

  for (const argument of visibleArguments(command)) {
    const argumentDescription = helper.argumentDescription(argument);
    if (argumentDescription) {
      lines.push(...definition(helper.argumentTerm(argument), argumentDescription));
    }
  }

  for (const option of visibleOptions(command)) {
    lines.push(...definition(helper.optionTerm(option), helper.optionDescription(option)));
  }

  return lines;
}

export function renderManPage(program: Command, options: ManPageOptions): string {
  const helper = program.createHelp();
  const name = program.name();

  const lines: string[] = [
    `.TH ${name.toUpperCase()} 1 "${options.date}" "${name} ${options.version}" "OpenSpec Manual"`,
    '.SH NAME',
    `${escapeRoff(name)} \\- ${textLine(oneLine(program.description()))}`,
    '.SH SYNOPSIS',
    `${bold(name)} [\\fIoptions\\fR] \\fIcommand\\fR [\\fIargs\\fR]`,
    '.SH DESCRIPTION',
  ];

  for (const paragraph of DESCRIPTION) {
    lines.push(textLine(paragraph), '.PP');
  }
  lines.pop();

  lines.push('.SH OPTIONS');
  for (const option of visibleOptions(program)) {
    lines.push(...definition(helper.optionTerm(option), helper.optionDescription(option)));
  }
  lines.push(...definition(HELP_OPTION_FLAGS, 'Display help for a command. Accepted by every command.'));

  lines.push('.SH COMMANDS');
  for (const command of flattenCommands(program)) {
    lines.push(...renderCommand(command));
  }

  lines.push('.SH SEE ALSO');
  for (const entry of SEE_ALSO) {
    lines.push(textLine(entry), '.br');
  }
  lines.pop();

  return lines.join('\n') + '\n';
}
