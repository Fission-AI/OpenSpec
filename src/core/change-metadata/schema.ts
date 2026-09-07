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
  initiative: InitiativeLinkSchema.optional(),
  // Declares that this change intentionally has no spec deltas (pure refactor,
  // tooling, or docs work). Validation accepts zero deltas, and the artifact
  // graph counts artifacts whose `generates` path lives under specs/ as
  // complete - that path prefix, not the artifact id, is the contract custom
  // schemas inherit.
  skip_specs: z.boolean().optional(),
  // Declares that this change may retire a capability: when its REMOVED entries
  // take the last requirement a capability has, archive deletes that
  // capability's main spec instead of aborting on a spec it could not write
  // (#1302). Required because the deletion is not recoverable from the working
  // tree - only from git - so it is the author's call, not an inference from the
  // shape of a delta.
  retire_capabilities: z.boolean().optional(),
  // Where the change sits in its own lifecycle, as data rather than as a
  // directory position. Optional and absent by default: a change with no
  // `status` is `proposed`, which is what every change in `changes/` has always
  // meant. Declaring `shipped` says "these deltas belong in `specs/` now", and
  // is what `openspec sync --check` gates on - so a proposed change passes the
  // gate for free and red means a real mistake, instead of a check that is red
  // for the whole life of an open PR (#1683).
  //
  // Nothing writes this field on its own: `openspec new change` does not emit
  // it, and `archive` neither reads nor stamps it. A project that never opts in
  // never sees it.
  status: z.enum(['proposed', 'shipped']).optional(),
});

export type ChangeMetadata = z.infer<typeof ChangeMetadataSchema>;
