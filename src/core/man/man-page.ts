/**
 * Man page generation.
 *
 * The page is rendered from the live commander program, so `man openspec` and
 * `openspec --help` can never disagree: a command, flag, or description added
 * to the CLI shows up in the manual without anyone editing it here.
 */

import type { Command, Option, Argument } from 'commander';

/**
 * Where the build writes the page, relative to `dist/`. The `man` field in
 * package.json points at the same file; the packaging test holds them together.
 */
export const MAN_PAGE_RELATIVE_PATH = 'man/openspec.1';

/**
 * The page date, as `SOURCE_DATE_EPOCH` if the environment sets a usable one.
 * Packagers set it so identical sources produce an identical page.
 *
 * `now` is passed in rather than read, so the fallback is testable.
 */
export function resolveBuildDate(epoch: string | undefined, now: Date): string {
  const seconds = epoch === undefined || epoch.trim() === '' ? Number.NaN : Number(epoch);
  const stamped = new Date(seconds * 1000);
  // A number can still land outside the range Date represents, and
  // toISOString throws on that rather than returning anything useful.
  const date = Number.isNaN(stamped.getTime()) ? now : stamped;
  return date.toISOString().slice(0, 10);
}

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

/**
 * Sections a reader expects a manual to answer that the command tree cannot.
 * Each is held to the docs by a test rather than by good intentions:
 * `test/core/man/man-page.test.ts` checks the exit codes and the environment
 * variables against `docs/cli.md`, and parses every example against the real
 * program so a renamed command or dropped flag fails the build.
 */
export const EXIT_STATUS: ReadonlyArray<readonly [string, string]> = [
  ['0', 'Success.'],
  ['1', 'An error: a validation failure, a missing file, a refused operation.'],
  ['130', 'Cancelled at a prompt.'],
];

export const ENVIRONMENT: ReadonlyArray<readonly [string, string]> = [
  ['OPENSPEC_TELEMETRY', 'Set to 0 to disable telemetry and the update check.'],
  ['DO_NOT_TRACK', 'Set to 1 for the same effect, as the standard signal.'],
  ['OPENSPEC_CONCURRENCY', 'How many items bulk validation checks at once (default: 6).'],
  ['EDITOR, VISUAL', 'The editor openspec config edit opens.'],
  ['NO_COLOR', 'Disable color output when set.'],
  ['OPENSPEC_NO_ANIMATION', 'Skip the openspec init welcome animation when set.'],
  ['OPENSPEC_NO_COMPLETIONS', 'Set to 1 to suppress the one-time shell-completions tip.'],
  ['OPENSPEC_NO_UPDATE_CHECK', 'Skip the check for a newer published CLI when set.'],
  ['npm_config_registry', 'The registry that update check asks. No .npmrc file is read.'],
];

export const FILES: ReadonlyArray<readonly [string, string]> = [
  ['openspec/', "The project's OpenSpec root, created by openspec init."],
  ['openspec/specs/', 'The specs that describe what the project does today.'],
  ['openspec/changes/', 'Active changes; archived ones move under changes/archive/.'],
  ['openspec/config.yaml', 'Project configuration: context, rules, references.'],
  [
    '~/.config/openspec/',
    'Machine-wide configuration. $XDG_CONFIG_HOME/openspec/ when that is set, %APPDATA%\\openspec\\ on Windows. Run openspec config path to print it.',
  ],
];

export const EXAMPLES: ReadonlyArray<readonly [string, string]> = [
  ['openspec init', 'Set up openspec/ here and install the workflows for your AI tools.'],
  ['openspec list --specs', 'List the capabilities the project has specified.'],
  ['openspec show add-user-auth', 'Read a change: its proposal, deltas, and tasks.'],
  ['openspec status --change add-user-auth', 'Report which of the change\'s artifacts are done.'],
  ['openspec validate --all --strict', 'Check every change and spec, failing on warnings.'],
  ['openspec archive add-user-auth --yes', 'Fold a finished change into the main specs.'],
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
 * Source lines are wrapped near this width. roff refills the text when it
 * renders, so this changes nothing a reader sees; it keeps the generated page
 * diffable and quiet under `mandoc -T lint`, which flags long source lines.
 */
const SOURCE_LINE_WIDTH = 76;

/**
 * Protect a line whose first character is `.` or `'`, which roff would read as
 * a macro. Wrapping makes this a real hazard rather than a theoretical one: a
 * sentence mentioning `.npmrc` can put that word at the start of a line.
 */
function protectMacroStart(line: string): string {
  return /^[.']/.test(line) ? `\\&${line}` : line;
}

/**
 * Emit escaped, wrapped text lines for one paragraph of prose.
 */
function textLines(text: string): string[] {
  const escaped = escapeRoff(oneLine(text));
  if (escaped.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let current = '';
  for (const word of escaped.split(' ')) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= SOURCE_LINE_WIDTH) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);

  return lines.map(protectMacroStart);
}

/**
 * Fields inside a quoted `.TH` argument. A literal quote would end the
 * argument early, so it becomes roff's double-quote glyph.
 */
function headerField(text: string): string {
  // Not escapeRoff: `.TH` dates are written plainly by every man page on the
  // system, and escaping their hyphens leaves mandoc unable to parse the date.
  // The hazards here are the ones that break the header's quoted arguments.
  return oneLine(text).replace(/\\/g, '\\e').replace(/"/g, '\\(dq');
}

function bold(text: string): string {
  return `\\fB${escapeRoff(text)}\\fR`;
}

function definition(term: string, description: string): string[] {
  const body = textLines(description);
  // `\&` is a zero-width character: it keeps the entry well-formed when an
  // option carries no description.
  return ['.TP', bold(oneLine(term)), ...(body.length > 0 ? body : ['\\&'])];
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

  lines.push(...textLines(command.description()));

  const aliases = command.aliases();
  if (aliases.length > 0) {
    lines.push(...textLines(`Also invoked as: ${aliases.join(', ')}`));
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
    // Every field here is escaped too: a date's hyphens, or a prerelease
    // version's, would otherwise render as typographic minus in the footer.
    `.TH ${headerField(name.toUpperCase())} 1 "${headerField(options.date)}" "${headerField(name)} ${headerField(options.version)}" "OpenSpec Manual"`,
    '.SH NAME',
    `${escapeRoff(name)} \\- ${escapeRoff(oneLine(program.description()))}`,
    '.SH SYNOPSIS',
    `${bold(name)} [\\fIoptions\\fR] \\fIcommand\\fR [\\fIargs\\fR]`,
    '.SH DESCRIPTION',
  ];

  for (const paragraph of DESCRIPTION) {
    lines.push(...textLines(paragraph), '.PP');
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

  lines.push('.SH EXIT STATUS');
  for (const [code, meaning] of EXIT_STATUS) {
    lines.push(...definition(code, meaning));
  }

  lines.push('.SH ENVIRONMENT');
  for (const [variable, effect] of ENVIRONMENT) {
    lines.push(...definition(variable, effect));
  }

  lines.push('.SH FILES');
  for (const [file, role] of FILES) {
    lines.push(...definition(file, role));
  }

  lines.push('.SH EXAMPLES');
  for (const [command, purpose] of EXAMPLES) {
    lines.push(...definition(command, purpose));
  }

  lines.push('.SH SEE ALSO');
  for (const entry of SEE_ALSO) {
    lines.push(...textLines(entry), '.br');
  }
  lines.pop();

  return lines.join('\n') + '\n';
}
