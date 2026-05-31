/**
 * Trello Configuration
 *
 * Types and utilities for reading the optional `pscode/trello.yaml`
 * integration file. This file is created by /ps:trello-setup and
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
  /** Ideias, rascunhos e tarefas pré-refinadas — "Backlog" */
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

// ─────────────────────────────────────────────────────────────────────────────
// Labels / Etiquetas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Chaves de label predefinidas no Pscode.
 */
export type TrelloLabelKey = 'bug' | 'implementacao' | 'melhoria' | 'debito-tecnico';

export interface TrelloLabelEntry {
  /** ID da etiqueta no Trello (obtido após criação via MCP) */
  id: string;
  /** Nome exibido na etiqueta */
  name: string;
  /** Cor da etiqueta no Trello (red, blue, green, orange, …) */
  color: string;
}

/** Configuração de labels — presente quando o usuário optou por usá-las. */
export interface TrelloLabelsConfig {
  /** Se false, o agente não aplica labels nos cards. */
  enabled: boolean;
  /** Map de chave semântica → entrada de label no Trello. */
  items?: Partial<Record<TrelloLabelKey, TrelloLabelEntry>>;
}

/** Definição estática de cada label padrão do Pscode. */
export interface LabelDefinition {
  key: TrelloLabelKey;
  name: string;
  color: string;
  emoji: string;
  description: string;
}

/**
 * Definições canônicas das labels do Pscode.
 * Usadas tanto na CLI (trello-init-prompt) quanto nos templates de skill.
 */
export const DEFAULT_LABEL_DEFINITIONS: LabelDefinition[] = [
  {
    key: 'bug',
    name: 'BUG',
    color: 'red',
    emoji: '🐛',
    description: 'Erro ou comportamento incorreto que precisa ser corrigido',
  },
  {
    key: 'implementacao',
    name: 'IMPLEMENTAÇÃO',
    color: 'blue',
    emoji: '⚙️',
    description: 'Nova funcionalidade desenvolvida do zero',
  },
  {
    key: 'melhoria',
    name: 'MELHORIA',
    color: 'green',
    emoji: '✨',
    description: 'Aperfeiçoamento ou otimização de algo existente',
  },
  {
    key: 'debito-tecnico',
    name: 'DÉBITO TÉCNICO',
    color: 'orange',
    emoji: '💳',
    description: 'Refatoração, limpeza de código ou resolução de dívida técnica',
  },
];

export interface TrelloConfig {
  /** Trello board ID */
  boardId: string;
  /** Board display name (informational only) */
  boardName?: string;
  /** List ID map keyed by semantic stage */
  lists: TrelloListMap;
  /** Labels/etiquetas configuradas no board — presente quando o usuário optou por usá-las */
  labels?: TrelloLabelsConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// File path resolution
// ─────────────────────────────────────────────────────────────────────────────

export const TRELLO_CONFIG_FILENAME = 'trello.yaml';

/**
 * Returns the expected path for `pscode/trello.yaml` relative to a project root.
 */
export function getTrelloConfigPath(projectPath: string): string {
  return path.join(projectPath, 'pscode', TRELLO_CONFIG_FILENAME);
}

// ─────────────────────────────────────────────────────────────────────────────
// Read / Write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads `pscode/trello.yaml` from the given project root.
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
 * Writes a `TrelloConfig` to `pscode/trello.yaml`.
 */
export function writeTrelloConfig(projectPath: string, config: TrelloConfig): void {
  const configPath = getTrelloConfigPath(projectPath);
  const yaml = stringifyYaml(config, { lineWidth: 0 });
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, yaml, 'utf-8');
}
