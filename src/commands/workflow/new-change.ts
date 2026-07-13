/**
 * New Change Command
 *
 * Creates a new change directory with optional description and schema in the
 * resolved OpenSpec root. `--store <id>` selects a registered store's root;
 * `--serves <ref>` links the change upward to the work it serves. Workspace
 * affected areas are no longer part of this command.
 */

import ora from 'ora';
import path from 'path';
import { ServesRefSchema } from '../../core/change-metadata/schema.js';
import { recordLinkedRoot, resolveUpstreamLink } from '../../core/upstream.js';
import { addReferenceToProjectConfig } from '../../core/project-config.js';
import { createChange, validateChangeName } from '../../utils/change-utils.js';
import { formatChangeLocation } from '../../core/planning-home.js';
import {
  resolveRootForCommand,
  RootSelectionError,
  toPlanningHome,
  toRootOutput,
  withStoreFlag,
  type ResolvedOpenSpecRoot,
  type RootOutput,
  isStoreSelectedRoot,
} from '../../core/root-selection.js';
import { printJson, statusFromError, validateSchemaExists } from './shared.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface NewChangeOptions {
  description?: string;
  goal?: string;
  schema?: string;
  /** Link the change to the work it serves: `<change>` or `<store-id>/<change>`. */
  serves?: string;
  store?: string;
  storePath?: string;
  initiative?: string;
  areas?: string;
  json?: boolean;
}

interface NewChangeOutput {
  change: {
    id: string;
    path: string;
    metadataPath: string;
    schema: string;
  };
  /** Present when the change was born serving upstream work. */
  serves?: {
    ref: string;
    /** Whether the upstream change was found on disk at link time. */
    resolved: boolean;
    /** Whether linking auto-added the store to `references:` in config. */
    reference_wiring?: 'added' | 'already' | 'skipped';
  };
  root: RootOutput;
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

function assertRemovedOptionsAbsent(options: NewChangeOptions): void {
  if (options.initiative !== undefined) {
    throw new RootSelectionError(
      '--initiative is no longer supported. Upstream work is a change in its store; link to it with --serves <store-id>/<change>.',
      'initiative_option_removed',
      { target: 'change.options' }
    );
  }

  if (options.areas !== undefined) {
    throw new RootSelectionError(
      '--areas is no longer supported. Workspace affected areas are not part of the normal OpenSpec root path.',
      'areas_option_removed',
      { target: 'change.options' }
    );
  }
}

function printCreatedChangeHuman(
  payload: NewChangeOutput,
  root: ResolvedOpenSpecRoot
): void {
  // A relative path is only honest when the root is where the user
  // stands; a distant ancestor root gets the absolute path.
  const location =
    !isStoreSelectedRoot(root) && root.path === process.cwd()
      ? formatChangeLocation(toPlanningHome(root), payload.change.id)
      : payload.change.path;
  console.log(`Created change '${payload.change.id}' at ${location}/`);
  console.log(`Schema: ${payload.change.schema}`);
  if (payload.serves) {
    const { ref, resolved, reference_wiring: wiring } = payload.serves;
    const storeId = ref.includes('/') ? ref.split('/')[0] : null;
    const rollup = storeId
      ? `openspec list --downstream --store ${storeId}`
      : 'openspec list --downstream';
    console.log(`Serves: ${ref}  (rollup: ${rollup})`);
    if (!resolved) {
      console.log(
        `Warning: '${ref}' was not found on this machine — the link will show as missing in rollups until that change exists.`
      );
    }
    if (wiring === 'added') {
      console.log(
        `Referenced store '${storeId}' in openspec/config.yaml — agents here now see its context.`
      );
    } else if (wiring === 'skipped') {
      console.log(
        `Tip: add 'references: [${storeId}]' to openspec/config.yaml so agents here see that store's context.`
      );
    }
  }
  console.log(`Next: ${withStoreFlag(root, `openspec status --change ${payload.change.id}`)}`);
}

export async function newChangeCommand(name: string | undefined, options: NewChangeOptions): Promise<void> {
  const spinner = options.json ? undefined : ora();

  try {
    if (!name) {
      throw new Error('Missing required argument <name>');
    }

    const validation = validateChangeName(name);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    assertRemovedOptionsAbsent(options);

    // Validate the ref before anything is created: a bad value must not
    // leave a half-written change behind.
    if (options.serves !== undefined) {
      const ref = ServesRefSchema.safeParse(options.serves);
      if (!ref.success) {
        throw new Error(ref.error.issues[0].message);
      }
    }

    const root = await resolveRootForCommand(options, {
      json: options.json,
      failurePayload: { change: null },
    });
    if (!root) {
      return;
    }

    const projectRoot = root.path;

    // Validate schema if provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    const resolvedSchema = options.schema ?? root.defaultSchema;
    if (spinner) {
      spinner.start(`Creating change '${name}' with schema '${resolvedSchema}'...`);
    }

    const result = await createChange(projectRoot, name, {
      schema: options.schema,
      defaultSchema: root.defaultSchema,
      changesDir: root.changesDir,
      metadata: {
        ...(options.goal ? { goal: options.goal } : {}),
        ...(options.serves ? { serves: options.serves } : {}),
      },
    });

    // If description provided, create README.md with description
    if (options.description) {
      const { promises: fs } = await import('fs');
      const readmePath = path.join(result.changeDir, 'README.md');
      await fs.writeFile(readmePath, `# ${name}\n\n${options.description}\n`, 'utf-8');
    }

    // A store-qualified link makes this repo part of that store's rollup.
    // Linking does ALL the wiring: record the checkout so rollups scan it,
    // and reference the store so agents here see its context — neither
    // failure may fail the created change.
    let referenceWiring: 'added' | 'already' | 'skipped' | null = null;
    if (options.serves?.includes('/')) {
      await recordLinkedRoot(projectRoot).catch(() => undefined);
      const storeId = options.serves.split('/')[0];
      try {
        referenceWiring = addReferenceToProjectConfig(projectRoot, storeId);
      } catch {
        referenceWiring = 'skipped';
      }
    }

    // Resolve (never block on) the upstream link so a typo is visible at
    // creation time instead of surfacing later as a dangling rollup entry.
    let servesResolved = false;
    if (options.serves) {
      const link = await resolveUpstreamLink(result.changeDir, projectRoot).catch(
        () => null
      );
      servesResolved = link?.path !== null && link !== null;
    }

    const payload: NewChangeOutput = {
      change: {
        id: name,
        path: result.changeDir,
        metadataPath: path.join(result.changeDir, '.openspec.yaml'),
        schema: result.schema,
      },
      ...(options.serves
        ? {
            serves: {
              ref: options.serves,
              resolved: servesResolved,
              ...(referenceWiring ? { reference_wiring: referenceWiring } : {}),
            },
          }
        : {}),
      root: toRootOutput(root),
    };

    if (options.json) {
      printJson(payload);
      return;
    }

    spinner?.stop();
    printCreatedChangeHuman(payload, root);
  } catch (error) {
    spinner?.stop();
    if (options.json) {
      printJson({
        change: null,
        status: [statusFromError(error)],
      });
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}
