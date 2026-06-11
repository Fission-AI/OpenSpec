/**
 * The workset command's interactive prompt flows (the compose wizard,
 * the open-time tool select, the remove confirm). @inquirer is always
 * imported dynamically at the call site - never at module top.
 */
import * as path from 'node:path';

import { pathIsDirectory } from '../core/file-state.js';
import {
  listOpenerChoices,
  type OpenerChoice,
  type OpenerDefinition,
} from '../core/openers.js';
import { expandUserPath } from '../core/store/operations.js';
import {
  memberLabelProblem,
  validateWorksetName,
  type Workset,
  type WorksetMember,
} from '../core/worksets.js';
import {
  asErrorMessage,
  finalizeWorkset,
  resolveMemberFlags,
  toolUnknownError,
} from './workset-input.js';

export interface ComposeInput {
  memberFlags: string[];
  tool?: string;
}

export async function composeInteractively(
  givenName: string | undefined,
  input: ComposeInput,
  table: OpenerDefinition[]
): Promise<Workset> {
  const prompts = await import('@inquirer/prompts');

  console.log('[1/3] Name the workset');
  let name: string;
  if (givenName !== undefined) {
    name = validateWorksetName(givenName);
    console.log(`  Workset name: ${name}`);
  } else {
    name = await prompts.input({
      message: 'Workset name:',
      required: true,
      validate(value: string) {
        try {
          validateWorksetName(value);
          return true;
        } catch (error) {
          return asErrorMessage(error);
        }
      },
    });
  }

  console.log('');
  console.log(
    '[2/3] Add member folders (the first one is the primary - sessions start there)'
  );
  // Flag-provided members are resolved AND validated before any
  // prompting, so a bad flag cannot discard a finished wizard walk.
  const members: WorksetMember[] = await resolveMemberFlags(input.memberFlags);
  finalizeWorksetMembersPreview(name, members, input.tool, table);

  while (true) {
    if (members.length > 0) {
      const next = await prompts.select({
        message: 'Add another folder or finish:',
        choices: [
          { name: 'Finish', value: 'finish' },
          { name: 'Add another folder', value: 'add' },
        ],
        default: 'finish',
      });
      if (next === 'finish') {
        break;
      }
    }

    const rawPath = await prompts.input({
      message: 'Folder path:',
      ...(members.length === 0 ? { default: '.', prefill: 'editable' } : {}),
      required: true,
      async validate(value: string) {
        const resolved = path.resolve(expandUserPath(value));
        if (!(await pathIsDirectory(resolved))) {
          return `'${value}' is not an existing folder`;
        }
        return true;
      },
    });

    const resolvedPath = path.resolve(expandUserPath(rawPath));
    let label = path.basename(resolvedPath);
    const collision = members.some((member) => member.name === label);
    if (memberLabelProblem(label) !== null || collision) {
      label = await prompts.input({
        message: 'Name this member (the folder label):',
        required: true,
        validate(value: string) {
          const problem = memberLabelProblem(value);
          if (problem !== null) {
            return problem;
          }
          if (members.some((member) => member.name === value)) {
            return `duplicate member name '${value}'`;
          }
          return true;
        },
      });
    }

    members.push({ name: label, path: resolvedPath });
    console.log(`  Added '${label}' (${resolvedPath})`);
  }

  console.log('');
  console.log('[3/3] Choose your tool');
  let tool = input.tool;
  if (tool === undefined) {
    const choices = listOpenerChoices(table);
    const available = choices.filter((choice) => choice.available);
    if (available.length === 0) {
      console.log(
        '  None of the known tools is on PATH; not saving a preference.'
      );
      console.log(
        `  (Known tools: ${choices.map((choice) => `${choice.opener.id} ${choice.note ?? ''}`.trim()).join(', ')})`
      );
    } else {
      tool = await promptToolFromChoices(available);
    }
  }

  return finalizeWorkset(name, members, tool, table);
}

/**
 * Early validation of flag-provided pieces (duplicates, unknown tool)
 * before the wizard spends the user's time.
 */
function finalizeWorksetMembersPreview(
  name: string,
  members: WorksetMember[],
  tool: string | undefined,
  table: OpenerDefinition[]
): void {
  if (members.length > 0) {
    finalizeWorkset(name, members, tool, table);
    for (const member of members) {
      console.log(`  Added '${member.name}' (${member.path})`);
    }
  } else if (tool !== undefined) {
    // No members yet, but a bad --tool should still fail up front.
    finalizeWorksetToolCheck(tool, table);
  }
}

function finalizeWorksetToolCheck(
  tool: string,
  table: OpenerDefinition[]
): void {
  if (!table.some((opener) => opener.id === tool)) {
    throw toolUnknownError(tool, table);
  }
}

export async function promptToolFromChoices(
  available: OpenerChoice[]
): Promise<string> {
  const { select } = await import('@inquirer/prompts');
  return select({
    message: 'Open with:',
    choices: available.map((choice) => ({
      name: choice.opener.label,
      value: choice.opener.id,
    })),
  });
}

export async function promptOpenNow(label: string): Promise<boolean> {
  const { confirm } = await import('@inquirer/prompts');
  return confirm({
    message: `Open it now in ${label}?`,
    default: true,
  });
}

/** Prints the workset (decision 13: remove shows what it removes). */
export async function confirmRemoveInteractively(
  workset: Workset
): Promise<boolean> {
  const { confirm } = await import('@inquirer/prompts');

  console.log(`Workset '${workset.name}':`);
  const width = Math.max(
    ...workset.members.map((member) => member.name.length)
  );
  for (const member of workset.members) {
    console.log(`  ${member.name.padEnd(width)}  ${member.path}`);
  }

  return confirm({
    message: `Remove workset '${workset.name}'? (member folders are never touched)`,
    default: false,
  });
}
