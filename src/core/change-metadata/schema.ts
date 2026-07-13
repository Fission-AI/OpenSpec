import { z } from 'zod';
import { isKebabId } from '../id.js';

export { isKebabId } from '../id.js';

const KebabIdentifierSchema = (label: string): z.ZodString =>
  z.string().superRefine((value, ctx) => {
    if (!isKebabId(value)) {
      ctx.addIssue({
        code: 'custom',
        message: `${label} must be kebab-case with lowercase letters, numbers, and single hyphen separators`,
      });
    }
  });

export const InitiativeLinkSchema = z.object({
  store: KebabIdentifierSchema('Store id'),
  id: KebabIdentifierSchema('Initiative id'),
}).strict();

export type InitiativeLink = z.infer<typeof InitiativeLinkSchema>;

// The upward link to the work this change serves: `<change>` for a change
// in the same root, or `<store-id>/<change>` for one in that registered
// store.
export const ServesRefSchema = z.string().superRefine((value, ctx) => {
  const parts = value.split('/');
  const valid =
    (parts.length === 1 || parts.length === 2) &&
    parts.every((part) => isKebabId(part));
  if (!valid) {
    ctx.addIssue({
      code: 'custom',
      message:
        'serves must be a kebab-case change id, optionally prefixed with a store id: <change> or <store-id>/<change>',
    });
  }
});

// Per-change metadata schema. The schema field is validated against available
// workflow schemas when metadata is read or written.
export const ChangeMetadataSchema = z.object({
  schema: z.string().min(1, { message: 'schema is required' }),
  created: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'created must be YYYY-MM-DD format',
    })
    .optional(),
  goal: z.string().min(1).optional(),
  affected_areas: z.array(z.string().min(1)).optional(),
  serves: ServesRefSchema.optional(),
  // Legacy initiative links are tolerated in BOTH shapes the beta wrote —
  // the `{store, id}` object and the `<store>/<name>` string — read-only,
  // never re-emitted. A change that carries one must never fail to load.
  initiative: z.union([InitiativeLinkSchema, z.string().min(1)]).optional(),
});

export type ChangeMetadata = z.infer<typeof ChangeMetadataSchema>;
