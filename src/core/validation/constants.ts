/**
 * Validation threshold constants
 */

// Minimum character lengths
export const MIN_WHY_SECTION_LENGTH = 50;
export const MIN_PURPOSE_LENGTH = 50;

// Maximum character/item limits
export const MAX_WHY_SECTION_LENGTH = 1000;
export const MAX_REQUIREMENT_TEXT_LENGTH = 500;
export const MAX_DELTAS_PER_CHANGE = 10;

// Validation messages
export const VALIDATION_MESSAGES = {
  // Required content
  SCENARIO_EMPTY: 'O texto do cenário não pode estar vazio',
  REQUIREMENT_EMPTY: 'O texto do requisito não pode estar vazio',
  REQUIREMENT_NO_SHALL: 'O requisito deve conter as palavras-chave SHALL ou MUST',
  REQUIREMENT_NO_SCENARIOS: 'O requisito deve ter pelo menos um cenário',
  SPEC_NAME_EMPTY: 'O nome da especificação não pode estar vazio',
  SPEC_PURPOSE_EMPTY: 'A seção Purpose não pode estar vazia',
  SPEC_NO_REQUIREMENTS: 'A especificação deve ter pelo menos um requisito',
  CHANGE_NAME_EMPTY: 'O nome da alteração não pode estar vazio',
  CHANGE_WHY_TOO_SHORT: `A seção Why deve ter pelo menos ${MIN_WHY_SECTION_LENGTH} caracteres`,
  CHANGE_WHY_TOO_LONG: `A seção Why não deve exceder ${MAX_WHY_SECTION_LENGTH} caracteres`,
  CHANGE_WHAT_EMPTY: 'A seção What Changes não pode estar vazia',
  CHANGE_NO_DELTAS: 'A alteração deve ter pelo menos um delta',
  CHANGE_TOO_MANY_DELTAS: `Considere dividir alterações com mais de ${MAX_DELTAS_PER_CHANGE} deltas`,
  DELTA_SPEC_EMPTY: 'O nome da especificação não pode estar vazio',
  DELTA_DESCRIPTION_EMPTY: 'A descrição do delta não pode estar vazia',

  // Warnings
  PURPOSE_TOO_BRIEF: `A seção Purpose é muito breve (menos de ${MIN_PURPOSE_LENGTH} caracteres)`,
  REQUIREMENT_TOO_LONG: `O texto do requisito é muito longo (>${MAX_REQUIREMENT_TEXT_LENGTH} caracteres). Considere dividi-lo.`,
  DELTA_DESCRIPTION_TOO_BRIEF: 'A descrição do delta é muito breve',
  DELTA_MISSING_REQUIREMENTS: 'O delta deve incluir requisitos',

  // Guidance snippets (appended to primary messages for remediation)
  GUIDE_NO_DELTAS:
    'Nenhum delta encontrado. Certifique-se de que a alteração possui um diretório specs/ com pastas de capacidade (ex: specs/http-server/spec.md) contendo arquivos .md que usam cabeçalhos de delta (## ADDED/MODIFIED/REMOVED/RENAMED Requirements) e que cada requisito inclui pelo menos um bloco "#### Scenario:". Dica: execute "openspec change show <change-id> --json --deltas-only" para inspecionar os deltas analisados.',
  GUIDE_MISSING_SPEC_SECTIONS:
    'Seções obrigatórias ausentes. Cabeçalhos esperados: "## Purpose" e "## Requirements". Exemplo:\n## Purpose\n[breve propósito]\n\n## Requirements\n### Requirement: Declaração clara de requisito\nUsers SHALL ...\n\n#### Scenario: Nome descritivo\n- **WHEN** ...\n- **THEN** ...',
  GUIDE_MISSING_CHANGE_SECTIONS:
    'Seções obrigatórias ausentes. Cabeçalhos esperados: "## Why" e "## What Changes". Certifique-se de que os deltas estão documentados em specs/ usando cabeçalhos de delta.',
  GUIDE_SCENARIO_FORMAT:
    'Os cenários devem usar cabeçalhos de nível 4. Converta listas em:\n#### Scenario: Nome curto\n- **WHEN** ...\n- **THEN** ...\n- **AND** ...',
} as const;
