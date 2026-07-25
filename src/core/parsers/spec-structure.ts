import { buildCodeFenceMask } from './code-fence.js';

const REQUIREMENTS_SECTION_HEADER = /^##\s+Requirements\s*$/i;
const TOP_LEVEL_SECTION_HEADER = /^##\s+/;
const DELTA_HEADER = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/i;
const REQUIREMENT_HEADER = /^###\s+Requirement:\s*(.+)\s*$/i;

export interface MainSpecStructureIssue {
  kind: 'delta-header' | 'requirement-outside-requirements';
  line: number;
  header: string;
  message: string;
}

export function findMainSpecStructureIssues(content: string): MainSpecStructureIssue[] {
  const normalized = content.replace(/\r\n?/g, '\n');
  const stripped = stripFencedCodeBlocksPreservingLines(normalized);
  const lines = stripped.split('\n');
  const issues: MainSpecStructureIssue[] = [];

  const requirementsHeaderIndex = lines.findIndex(line => REQUIREMENTS_SECTION_HEADER.test(line));
  let requirementsEndIndex = lines.length;

  if (requirementsHeaderIndex !== -1) {
    for (let i = requirementsHeaderIndex + 1; i < lines.length; i++) {
      if (TOP_LEVEL_SECTION_HEADER.test(lines[i])) {
        requirementsEndIndex = i;
        break;
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (DELTA_HEADER.test(line)) {
      issues.push({
        kind: 'delta-header',
        line: i + 1,
        header: trimmed,
        message:
          `Main spec contains delta header "${trimmed}". ` +
          'Delta headers are only valid inside openspec/changes/<name>/specs/<capability>/spec.md ' +
          'and truncate the parsed ## Requirements section.',
      });
      continue;
    }

    const requirementMatch = line.match(REQUIREMENT_HEADER);
    if (!requirementMatch) {
      continue;
    }

    const insideRequirements =
      requirementsHeaderIndex !== -1 &&
      i > requirementsHeaderIndex &&
      i < requirementsEndIndex;

    if (!insideRequirements) {
      issues.push({
        kind: 'requirement-outside-requirements',
        line: i + 1,
        header: trimmed,
        message:
          `Requirement header "${trimmed}" appears outside the main ## Requirements section. ` +
          'Main specs only parse requirements inside that section, so this requirement is currently invisible to validate, list, and archive.',
      });
    }
  }

  return issues;
}

export function stripFencedCodeBlocksPreservingLines(content: string): string {
  const lines = content.split('\n');
  const mask = buildCodeFenceMask(lines);
  return lines.map((line, i) => (mask[i] ? '' : line)).join('\n');
}
