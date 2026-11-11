import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// #2234: a pull request that changes documentation only skips the CLI tests
// and binaries, and the `docs` job in ci.yml runs just the tests that read
// the docs. These checks keep that shortcut honest.
const projectRoot = process.cwd();

function readWorkflow(name: string): Record<string, any> {
  return parse(fs.readFileSync(path.join(projectRoot, '.github/workflows', name), 'utf8'));
}

function docsOnlyPatterns(workflow: Record<string, any>): string[] {
  const step = workflow.jobs.changes.steps.find((s: any) => s.id === 'code');
  return parse(step.with.filters).code;
}

function listTestFiles(dir: string): string[] {
  return fs.readdirSync(path.join(projectRoot, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return listTestFiles(relative);
    return entry.name.endsWith('.test.ts') ? [relative] : [];
  });
}

describe('documentation-only CI', () => {
  const ci = readWorkflow('ci.yml');
  const binaries = readWorkflow('binaries.yml');

  it('uses the same documentation paths for the CLI tests and the binaries', () => {
    expect(docsOnlyPatterns(binaries)).toEqual(docsOnlyPatterns(ci));
  });

  it('runs every test that reads the documentation in the docs job', () => {
    const run: string = ci.jobs.docs.steps.find((s: any) => s.name === 'Run docs tests').run;
    const listed = run.split(/\s+/).filter((word) => word.endsWith('.test.ts'));

    for (const file of listed) {
      expect(fs.existsSync(path.join(projectRoot, file)), file).toBe(true);
    }

    const readsDocs = listTestFiles('test').filter((file) =>
      /docs-lab|website\//.test(fs.readFileSync(path.join(projectRoot, file), 'utf8'))
    );
    expect(readsDocs.length).toBeGreaterThan(0);
    for (const file of readsDocs) {
      expect(listed, `${file} reads the docs but the docs job does not run it`).toContain(file);
    }
  });
});
