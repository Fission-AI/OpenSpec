/**
 * Trello Init Prompt
 *
 * Handles the interactive Trello setup questions during `pastelsdd init`.
 * Saves a partial `pastelsdd/trello.yaml` with `configured: false` so that
 * `/pastel:trello-setup` (in Claude Code) can pick up where the CLI left off
 * and only needs to perform the MCP-dependent steps (list lookup/creation).
 */

import chalk from 'chalk';
import { stringify as stringifyYaml } from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import { PASTELSDD_DIR_NAME } from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// Stage definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface StageDefinition {
  key: string;
  defaultName: string;
  emoji: string;
  description: string;
  required?: boolean;
}

export const ALL_STAGES: StageDefinition[] = [
  { key: 'draft',      defaultName: 'Para Explorar',      emoji: '🧠', description: 'Ideias e rascunhos' },
  { key: 'backlog',    defaultName: 'Backlog',             emoji: '📋', description: 'Tarefas pré-refinadas', required: true },
  { key: 'refining',   defaultName: 'Em Refinamento',      emoji: '🔍', description: 'Em discussão/especificação' },
  { key: 'ready',      defaultName: 'Ready to Dev',        emoji: '✅', description: 'Aprovadas para desenvolvimento' },
  { key: 'developing', defaultName: 'Em Desenvolvimento',  emoji: '🚧', description: 'Em implementação' },
  { key: 'testing',    defaultName: 'Em Teste',            emoji: '🧪', description: 'Em validação/QA' },
  { key: 'deploy',     defaultName: 'Ready to Deploy',     emoji: '🚀', description: 'Prontas para produção' },
  { key: 'done',       defaultName: 'Concluído',           emoji: '✅', description: 'Entregues/arquivadas', required: true },
  { key: 'cancelled',  defaultName: 'Cancelado',           emoji: '❌', description: 'Descartadas' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Partial config types (saved by CLI, completed by /pastel:trello-setup)
// ─────────────────────────────────────────────────────────────────────────────

export interface TrelloPendingConfig {
  /** Always false when saved by CLI init — completed by /pastel:trello-setup */
  configured: false;
  /** Whether the user indicated they already have a Trello board */
  hasExistingBoard: boolean;
  /** Board ID provided by the user (only if hasExistingBoard = true) */
  boardId?: string;
  /** Selected stage keys in order */
  stages: string[];
  /** Custom names for each selected stage (overrides defaults) */
  stageNames: Record<string, string>;
}

export interface TrelloCompleteConfig {
  configured: true;
  boardId: string;
  boardName?: string;
  lists: Record<string, { id: string; name: string }>;
}

export type TrelloYamlConfig = TrelloPendingConfig | TrelloCompleteConfig;

// ─────────────────────────────────────────────────────────────────────────────
// Main prompt flow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the interactive Trello setup questions during `pastelsdd init`.
 * Returns whether the user chose to set up Trello.
 */
export async function runTrelloInitPrompt(pastelsddPath: string): Promise<boolean> {
  const configPath = path.join(pastelsddPath, 'trello.yaml');

  // If already configured (completed), skip silently
  if (fs.existsSync(configPath)) {
    try {
      const { parse } = await import('yaml');
      const existing = parse(fs.readFileSync(configPath, 'utf-8')) as TrelloYamlConfig;
      if (existing?.configured === true) {
        console.log(chalk.dim('  Trello: already configured (skipping)'));
        return true;
      }
    } catch {
      // Malformed file — allow re-prompt
    }
  }

  const { confirm, select, checkbox, input } = await import('@inquirer/prompts');

  console.log();
  console.log(chalk.bold('Trello Integration'));
  console.log(chalk.dim('  Sync cards automatically as changes move through your workflow.'));
  console.log();

  // ── Step 1: opt-in ─────────────────────────────────────────────────────────
  const wantsTrello = await confirm({
    message: 'Configure Trello integration?',
    default: false,
  });

  if (!wantsTrello) {
    return false;
  }

  // ── Step 2: existing board or create new ───────────────────────────────────
  const boardChoice = await select({
    message: 'Do you have a Trello board already set up for this project?',
    choices: [
      { value: 'existing', name: 'Yes, I have an existing board' },
      { value: 'new',      name: 'No, create a new board when I run /pastel:trello-setup' },
    ],
  });

  let boardId: string | undefined;

  if (boardChoice === 'existing') {
    boardId = await input({
      message: 'Board ID or URL (from trello.com/b/<id>/...):',
      validate: (v) => {
        const cleaned = extractBoardId(v.trim());
        return cleaned.length > 0 || 'Please enter a valid board ID or URL';
      },
      transformer: (v) => extractBoardId(v.trim()) || v.trim(),
    });
    boardId = extractBoardId(boardId.trim());
  }

  // ── Step 3: choose stages ──────────────────────────────────────────────────
  console.log();
  console.log(chalk.dim('  Select the workflow stages (columns) you want to use.'));
  console.log(chalk.dim('  Required stages are pre-selected and cannot be removed.'));
  console.log();

  const selectedKeys = await checkbox({
    message: 'Which workflow stages do you want?',
    choices: ALL_STAGES.map((s) => ({
      value: s.key,
      name: `${s.emoji} ${s.defaultName.padEnd(22)} — ${s.description}`,
      checked: true,   // all pre-selected; user unchecks what they don't want
      disabled: s.required ? '(required)' : false,
    })),
  });

  // Ensure required stages are always included
  const stages = Array.from(
    new Set([
      ...ALL_STAGES.filter((s) => s.required).map((s) => s.key),
      ...selectedKeys,
    ])
  ).filter((key) => ALL_STAGES.some((s) => s.key === key));

  // ── Step 4: optional rename ────────────────────────────────────────────────
  const wantsRename = await confirm({
    message: 'Rename any columns? (leave defaults if not)',
    default: false,
  });

  const stageNames: Record<string, string> = {};

  if (wantsRename) {
    console.log(chalk.dim('  Press Enter to keep the default name.'));
    console.log();

    for (const key of stages) {
      const def = ALL_STAGES.find((s) => s.key === key)!;
      const customName = await input({
        message: `${def.emoji} ${key} column name:`,
        default: def.defaultName,
      });
      stageNames[key] = customName.trim() || def.defaultName;
    }
  } else {
    for (const key of stages) {
      const def = ALL_STAGES.find((s) => s.key === key)!;
      stageNames[key] = def.defaultName;
    }
  }

  // ── Step 5: save partial config ────────────────────────────────────────────
  const pendingConfig: TrelloPendingConfig = {
    configured: false,
    hasExistingBoard: boardChoice === 'existing',
    ...(boardId ? { boardId } : {}),
    stages,
    stageNames,
  };

  fs.mkdirSync(pastelsddPath, { recursive: true });
  fs.writeFileSync(configPath, stringifyYaml(pendingConfig, { lineWidth: 0 }), 'utf-8');

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a Trello board ID from either a raw ID or a full URL.
 * https://trello.com/b/<id>/<name>  →  <id>
 */
function extractBoardId(input: string): string {
  // Full URL pattern
  const urlMatch = input.match(/trello\.com\/b\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  // Raw ID (alphanumeric, 8+ chars)
  if (/^[a-zA-Z0-9]{6,}$/.test(input)) return input;

  return '';
}
