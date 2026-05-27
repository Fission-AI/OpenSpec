/**
 * Trello Configuration
 *
 * Types and utilities for reading the optional `pastelsdd/trello.yaml`
 * integration file. This file is created by /pastel:trello-setup and
 * consumed at runtime by all Trello-aware skills and commands.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TrelloListEntry {
  id: string;
  name: string;
}

/**
 * Semantic stage keys that map to Trello lists.
 * Not all stages need to be configured — unused stages are omitted.
 */
export interface TrelloListMap {
  /** Ideas, rascunhos, brainstorm — "Para Explorar" */
  draft?: TrelloListEntry;
  /** Pré-refinadas, prontas para estimativa — "Backlog" */
  backlog?: TrelloListEntry;
  /** Em discussão / especificação — "Em Refinamento" */
  refining?: TrelloListEntry;
  /** Aprovadas, prontas para dev — "Ready to Dev" */
  ready?: TrelloListEntry;
  /** Em desenvolvimento / implementação — "Em Desenvolvimento" */
  developing?: TrelloListEntry;
  /** Em validação / QA — "Em Teste" */
  testing?: TrelloListEntry;
  /** Aprovadas para ir a produção — "Ready to Deploy" */
  deploy?: TrelloListEntry;
  /** Entregues / arquivadas — "Concluído" */
  done?: TrelloListEntry;
  /** Descartadas — "Cancelado" */
  cancelled?: TrelloListEntry;
}

export interface TrelloConfig {
  /** Trello board ID */
  boardId: string;
  /** Board display name (informational only) */
  boardName?: string;
  /** List ID map keyed by semantic stage */
  lists: TrelloListMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// File path resolution
// ─────────────────────────────────────────────────────────────────────────────

export const TRELLO_CONFIG_FILENAME = 'trello.yaml';

/**
 * Returns the expected path for `pastelsdd/trello.yaml` relative to a project root.
 */
export function getTrelloConfigPath(projectPath: string): string {
  return path.join(projectPath, 'pastelsdd', TRELLO_CONFIG_FILENAME);
}

// ─────────────────────────────────────────────────────────────────────────────
// Read / Write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads `pastelsdd/trello.yaml` from the given project root.
 * Returns `null` if the file does not exist or is unparseable.
 */
export function readTrelloConfig(projectPath: string): TrelloConfig | null {
  const configPath = getTrelloConfigPath(projectPath);

  try {
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = parseYaml(raw) as TrelloConfig;
    if (!parsed?.boardId || !parsed?.lists) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Writes a `TrelloConfig` to `pastelsdd/trello.yaml`.
 */
export function writeTrelloConfig(projectPath: string, config: TrelloConfig): void {
  const configPath = getTrelloConfigPath(projectPath);
  const yaml = stringifyYaml(config, { lineWidth: 0 });
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, yaml, 'utf-8');
}
