import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AI_TOOLS } from '../src/core/config.js';
import { CommandAdapterRegistry } from '../src/core/command-generation/index.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED = fs.readFileSync(
  path.join(REPO_ROOT, 'docs-lab', 'reference', 'supported-tools.md'),
  'utf-8'
);
const section = (heading: string) =>
  SUPPORTED.split(`### ${heading}\n`)[1].split('\n### ')[0];
const tool = (id: string) => AI_TOOLS.find((candidate) => candidate.value === id)!;

// Where each tool loads skills from is checked against its upstream source;
// these pin the docs to the config so the two cannot drift (#2022).
describe('skill target documentation', () => {
  it('documents CoStrict skills in the folder the CLI writes them to', () => {
    expect(tool('costrict').skillsDir).toBe('.agents');
    expect(SUPPORTED).toContain('| CoStrict | `costrict` | `.agents/skills/` |');
    expect(section('CoStrict')).toContain('never from `.cospec/`');
  });

  it('documents CoStrict commands where the adapter writes them', () => {
    const commandPath = CommandAdapterRegistry.get('costrict')!.getFilePath('propose');
    expect(commandPath.split(path.sep).join('/')).toBe('.cospec/openspec/commands/opsx-propose.md');
    expect(section('CoStrict')).toContain('`.cospec/openspec/commands/`');
  });

  it('gives the same Hermes setup step in the CLI note and the docs', () => {
    const note = tool('hermes').setupNote!;
    for (const claim of ['hermes skills trust', 'v2026.6.5', 'skills.external_dirs']) {
      expect(note).toContain(claim);
      expect(section('Hermes Agent')).toContain(claim);
    }
  });
});
