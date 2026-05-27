import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

export const INITIATIVE_COLLECTION_ID = 'initiatives';
export const INITIATIVE_FILE_NAME = 'initiative.yaml';
export const INITIATIVE_REQUIREMENTS_FILE_NAME = 'requirements.md';
export const INITIATIVE_DESIGN_FILE_NAME = 'design.md';
export const INITIATIVE_DECISIONS_FILE_NAME = 'decisions.md';
export const INITIATIVE_QUESTIONS_FILE_NAME = 'questions.md';
export const INITIATIVE_TASKS_FILE_NAME = 'tasks.md';

export const INITIATIVE_MARKDOWN_FILE_NAMES = [
  INITIATIVE_REQUIREMENTS_FILE_NAME,
  INITIATIVE_DESIGN_FILE_NAME,
  INITIATIVE_DECISIONS_FILE_NAME,
  INITIATIVE_QUESTIONS_FILE_NAME,
  INITIATIVE_TASKS_FILE_NAME,
] as const;

export const INITIATIVE_FILE_NAMES = [
  INITIATIVE_FILE_NAME,
  ...INITIATIVE_MARKDOWN_FILE_NAMES,
] as const;

export type InitiativeMarkdownFileName = typeof INITIATIVE_MARKDOWN_FILE_NAMES[number];
export type InitiativeFileName = typeof INITIATIVE_FILE_NAMES[number];

export const INITIATIVE_STATUSES = [
  'exploring',
  'active',
  'complete',
  'archived',
] as const;

export type InitiativeStatus = typeof INITIATIVE_STATUSES[number];

export type InitiativeMetadataValue =
  | string
  | number
  | boolean
  | null
  | InitiativeMetadataValue[]
  | { [key: string]: InitiativeMetadataValue };

export type InitiativeMetadata = Record<string, InitiativeMetadataValue>;

const INITIATIVE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function assertNoNul(value: string, label: string): void {
  if (value.includes('\0')) {
    throw new Error(`${label} must not contain NUL bytes`);
  }
}

function nonBlankString(label: string): z.ZodString {
  return z.string().refine((value) => value.trim().length > 0, {
    message: `${label} must not be empty`,
  });
}

const InitiativeMetadataValueSchema: z.ZodType<InitiativeMetadataValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(InitiativeMetadataValueSchema),
    z.record(z.string(), InitiativeMetadataValueSchema),
  ])
);

const InitiativeMetadataSchema = z.record(z.string(), InitiativeMetadataValueSchema);

const InitiativeStateSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  title: nonBlankString('title'),
  summary: nonBlankString('summary'),
  status: z.enum(INITIATIVE_STATUSES),
  created: z.string().regex(INITIATIVE_DATE_PATTERN, {
    message: 'created must be YYYY-MM-DD format',
  }),
  owners: z.array(nonBlankString('owner')).default([]),
  metadata: InitiativeMetadataSchema.default({}),
}).strict();

export type InitiativeStateInput = z.input<typeof InitiativeStateSchema>;
export type InitiativeState = z.output<typeof InitiativeStateSchema>;

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const location = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${location}: ${issue.message}`;
    })
    .join('; ');
}

function parseYamlObject(content: string, label: string): unknown {
  try {
    return parseYaml(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${label}: ${message}`);
  }
}

export function validateInitiativeId(id: string): string {
  assertNoNul(id, 'Initiative id');

  if (id.length === 0) {
    throw new Error('Initiative id must not be empty');
  }

  if (id === '.' || id === '..') {
    throw new Error(`Initiative id must not be '${id}'`);
  }

  if (/[\\/]/u.test(id)) {
    throw new Error('Initiative id must not contain path separators');
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) {
    throw new Error(
      'Initiative id must be kebab-case with lowercase letters, numbers, and single hyphen separators'
    );
  }

  return id;
}

export function isValidInitiativeId(id: string): boolean {
  try {
    validateInitiativeId(id);
    return true;
  } catch {
    return false;
  }
}

function parseInitiativeStateInput(raw: unknown): InitiativeState {
  const result = InitiativeStateSchema.safeParse(raw);

  if (!result.success) {
    throw new Error(`Invalid initiative state: ${formatZodIssues(result.error)}`);
  }

  validateInitiativeId(result.data.id);

  return {
    version: 1,
    id: result.data.id,
    title: result.data.title,
    summary: result.data.summary,
    status: result.data.status,
    created: result.data.created,
    owners: result.data.owners,
    metadata: result.data.metadata,
  };
}

export function parseInitiativeState(content: string): InitiativeState {
  return parseInitiativeStateInput(parseYamlObject(content, 'initiative state'));
}

export function serializeInitiativeState(state: InitiativeStateInput): string {
  const parsedState = parseInitiativeStateInput(state);

  return stringifyYaml({
    version: 1,
    id: parsedState.id,
    title: parsedState.title,
    summary: parsedState.summary,
    status: parsedState.status,
    created: parsedState.created,
    owners: parsedState.owners,
    metadata: parsedState.metadata,
  });
}
