import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import {
  getOpsxProposeSkillTemplate,
  getOpsxProposeCommandTemplate,
  getFfChangeSkillTemplate,
  getOpsxFfCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { loadSchema } from '../../../src/core/artifact-graph/schema.js';

const proposeBodies: Array<[string, string]> = [
  ['propose skill', getOpsxProposeSkillTemplate().instructions],
  ['propose command', getOpsxProposeCommandTemplate().content],
];

// ff runs the byte-identical artifact loop, so it carries the identical guards.
const loopBodies: Array<[string, string]> = [
  ...proposeBodies,
  ['ff skill', getFfChangeSkillTemplate().instructions],
  ['ff command', getOpsxFfCommandTemplate().content],
];

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const defaultSchema = loadSchema(path.join(repoRoot, 'schemas', 'spec-driven', 'schema.yaml'));

/** The opening list that tells the agent which artifacts propose will produce. */
function artifactPreamble(body: string): string {
  const start = body.indexOf("I'll create a change with");
  const end = body.indexOf('When ready to implement');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return body.slice(start, end);
}

describe('propose preamble', () => {
  // #788/#1260: the preamble advertised proposal/design/tasks only, so agents
  // treated specs as optional and produced changes with no spec at all.
  // Derived from the schema so a new artifact cannot go unadvertised.
  it('advertises every artifact the default schema defines (#788, #1260)', () => {
    const ids = defaultSchema.artifacts.map(artifact => artifact.id);
    expect(ids).toContain('specs');

    for (const [label, body] of proposeBodies) {
      const preamble = artifactPreamble(body);
      for (const id of ids) {
        expect(preamble, `${label} preamble is missing the "${id}" artifact`).toContain(id);
      }
    }
  });
});

describe('artifact loop guards (propose and ff)', () => {
  // `status` is file-existence based (detectCompleted), so writing tasks.md before
  // specs flips tasks to done and satisfies a bare applyRequires stop condition
  // with specs never created. That is the #1260 failure chain.
  it('warns that a done applyRequires artifact does not imply its deps exist (#788, #1260)', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toMatch(/file-existence only/i);
      expect(body, label).toMatch(/does NOT mean its dependencies exist/i);
    }
  });

  // Scoped to the applyRequires closure, not to every `ready` artifact: a custom
  // schema may define artifacts outside it (e.g. a post-implementation retro)
  // that propose has no business creating.
  it('scopes the required set to the applyRequires dependency closure', () => {
    for (const [label, body] of loopBodies) {
      // Names the seed the walk starts from (`from those`) so an agent cannot
      // read it as "every artifact that has requires edges" = the whole list.
      expect(body, label).toContain('reachable from those by following the `requires` edges');
      // Points at status --json specifically (instructions calls the edges `dependencies`).
      expect(body, label).toContain('in `status --json`');
      expect(body, label).toContain('walk them transitively');
      expect(body, label).toContain('Leave artifacts outside that set alone');
    }
  });

  // alfred's PR #1412 blocker: `status --json` must carry the `requires` edges,
  // and the loop must derive the set from those edges rather than from `status`.
  // A `done` artifact hides nothing about its deps if the agent reads its edges.
  it('builds the required set from requires edges, not from status (#1412 review)', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        "Use each artifact's `requires` edges, not its `status`, to build the required set"
      );
      expect(body, label).toContain('a `done` artifact still lists what it depends on');
    }
  });

  // The status-JSON parse list must document the `requires` field the loop relies on.
  it('documents the requires edges in the status JSON it tells the agent to parse', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        'each with its `status` and its `requires` edges'
      );
    }
  });

  it('creates every missing artifact in the set and re-checks for cascades', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('Create every artifact in the required set that is missing');
      expect(body, label).toMatch(/re-check - creating one can unblock others/i);
    }
  });

  // specs must not be skippable — `openspec validate` rejects a change with no
  // deltas. "Required" is not machine-readable (the graph has tasks requiring
  // both specs and design), but the artifact's own instruction is: spec-driven's
  // design says "create only if any apply", specs says nothing of the kind.
  it('permits skipping only artifacts their own instruction marks conditional', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        'Skip one only when its own `instruction` says it is conditional'
      );
      expect(body, label).toContain('do not reconsider it');
    }
  });

  // The skip decision hinges on reading the artifact's `instruction` field, so
  // the loop must explicitly tell the agent to fetch it before skipping -
  // otherwise a momentum-driven agent can skip specs without ever checking.
  it('makes the agent fetch and read the instruction field before skipping', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        'run `openspec instructions <artifact-id> --change "<name>" --json` and skip only if its `instruction` field marks it optional'
      );
      expect(body, label).toContain('`specs` never does');
    }
  });

  // The 4b heading must not re-state the buggy stop condition (apply.requires
  // alone); it has to point the agent at the whole required set.
  it('frames the loop around the required set, not apply.requires alone', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        'Continue until every artifact in the required set exists (not just `apply.requires`)'
      );
      expect(body, label).not.toContain(
        'Continue until every artifact the apply phase depends on exists'
      );
    }
  });

  // The step-4 TITLE must not use "apply-ready" either: in the prewritten-tasks
  // case the change is already apply-ready when step 4 begins, so a title of
  // "create ... until apply-ready" invites the exact early-stop this PR kills.
  it('titles the create step around the required set, not "apply-ready"', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('**Create every artifact in the required set**');
      expect(body, label).not.toContain('Create artifacts in sequence until apply-ready');
      expect(body, label).not.toMatch(/^\s*4\.\s.*apply-ready/m);
    }
  });

  // Without this the loop deadlocks: skipping design leaves tasks blocked
  // forever, no artifact is ready, and the stop condition can never be met.
  // docs/concepts.md: "Dependencies are enablers, not gates."
  it('authorizes writing a blocked artifact whose only blocker was skipped', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('Dependencies are enablers, not gates');
      expect(body, label).toMatch(
        /still `blocked` only because you skipped a conditional dependency, write it anyway/
      );
    }
  });

  // The stop condition must cover the whole required set. A bare "stop when
  // applyRequires is done" is the lenient rule #1260 blames.
  it('stops on the whole required set, not on applyRequires alone', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        'Stop when every artifact in the required set is `done` or was deliberately skipped'
      );
      expect(body, label).not.toContain('Stop when all `applyRequires` artifacts are done');
    }
  });

  // The Guardrails section used to define completeness as `apply.requires`,
  // which is exactly the premise this fix refutes.
  it('does not define completeness as apply.requires in the guardrails', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).not.toMatch(
        /Create ALL artifacts needed for implementation \(as defined by schema's `apply\.requires`\)/
      );
      expect(body, label).toContain(
        'Create every artifact the apply phase transitively depends on'
      );
    }
  });

  // specs `generates` a glob (specs/**/*.md), so an agent told only to "write it
  // to resolvedOutputPath" would create a directory literally named `**`.
  it('tells the agent how to resolve a glob output path', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        'is a glob, follow `instruction` to choose the concrete file path'
      );
    }
  });
});
