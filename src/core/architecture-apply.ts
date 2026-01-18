/**
 * Architecture Application Logic
 *
 * Extracts architectural decisions from design.md and applies to architecture.md
 * during the archive process.
 */

import { promises as fs } from 'fs';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ArchitecturalDecision {
  date: string;
  decision: string;
  rationale: string;
  status: 'Active' | 'Superseded';
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Check if a design.md content indicates architectural impact
 */
export function hasArchitecturalImpact(designContent: string): boolean {
  // Keywords that suggest architectural decisions
  const architecturalPatterns = [
    /\barchitecture\b/i,
    /\bcomponent\b/i,
    /\bservice\b/i,
    /\bintegration\b/i,
    /\bdata.?flow\b/i,
    /\bmodule\b/i,
    /\bmicroservice\b/i,
    /\bAPI\b/i,
    /\bdatabase\b/i,
    /\bschema\b/i,
    /\bpattern\b/i,
  ];

  return architecturalPatterns.some((pattern) => pattern.test(designContent));
}

/**
 * Extract architectural decision from design.md content
 */
export function extractArchitecturalDecision(
  designContent: string,
  changeName: string,
  date: string
): ArchitecturalDecision | null {
  // Look for ## Decisions or ## Decision section
  const decisionsMatch = designContent.match(
    /##\s*Decisions?\s*\n([\s\S]*?)(?=\n##|$)/i
  );

  if (!decisionsMatch) {
    // No explicit decisions section, try to extract from context or first heading
    const firstContentMatch = designContent.match(
      /##\s*(?:Context|Overview|Summary)\s*\n([\s\S]*?)(?=\n##|$)/i
    );
    if (firstContentMatch) {
      const content = firstContentMatch[1].trim();
      if (content.length > 20) {
        return {
          date,
          decision: `Architectural change: ${changeName.replace(/-/g, ' ')}`,
          rationale: content.substring(0, 150).replace(/\n/g, ' ').trim(),
          status: 'Active',
        };
      }
    }
    return null;
  }

  const decisionsText = decisionsMatch[1].trim();
  if (!decisionsText || decisionsText.length < 20) {
    return null;
  }

  // Extract decision content
  const lines = decisionsText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  // Get the first substantive line as the decision
  let decision = '';
  let rationale = '';

  for (const line of lines) {
    const cleanLine = line.replace(/^[-*]\s*/, '').replace(/\*\*/g, '');
    if (!decision && cleanLine.length > 10) {
      decision = cleanLine;
    } else if (decision && !rationale && cleanLine.length > 10) {
      rationale = cleanLine;
      break;
    }
  }

  if (!decision) {
    decision = `From change: ${changeName}`;
  }
  if (!rationale) {
    rationale = 'See archived change for details';
  }

  return {
    date,
    decision: truncate(decision, 100),
    rationale: truncate(rationale, 150),
    status: 'Active',
  };
}

/**
 * Append architectural decision to architecture.md content
 */
export function appendArchitecturalDecision(
  archContent: string,
  decision: ArchitecturalDecision
): string {
  const tableRow = `| ${decision.date} | ${escapeTableCell(decision.decision)} | ${escapeTableCell(decision.rationale)} | ${decision.status} |`;

  // Find the Architectural Decisions table header
  const tableHeaderPattern =
    /(\|\s*Date\s*\|\s*Decision\s*\|\s*Rationale\s*\|\s*Status\s*\|\s*\n\|[-|\s]+\|)/i;
  const match = archContent.match(tableHeaderPattern);

  if (match) {
    // Insert after table header row
    const insertPos = match.index! + match[0].length;
    return (
      archContent.slice(0, insertPos) +
      '\n' +
      tableRow +
      archContent.slice(insertPos)
    );
  }

  // Table not found, try to find the section and add table
  const sectionPattern = /##\s*Architectural Decisions\s*\n/i;
  const sectionMatch = archContent.match(sectionPattern);

  if (sectionMatch) {
    const insertPos = sectionMatch.index! + sectionMatch[0].length;
    const tableContent = `
| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
${tableRow}
`;
    return (
      archContent.slice(0, insertPos) + tableContent + archContent.slice(insertPos)
    );
  }

  // Section not found, append at end
  return (
    archContent +
    `

## Architectural Decisions

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
${tableRow}
`
  );
}

/**
 * Apply architectural decisions from a change to architecture.md
 *
 * @param projectRoot - The project root directory
 * @param changeName - Name of the change being archived
 * @param changeDir - Path to the change directory
 * @param archiveDate - Date string for the decision (YYYY-MM-DD)
 * @returns True if architecture.md was updated
 */
export async function applyArchitecturalDecisions(
  projectRoot: string,
  changeName: string,
  changeDir: string,
  archiveDate: string
): Promise<boolean> {
  const architecturePath = `${projectRoot}/openspec/architecture.md`;
  const designPath = `${changeDir}/design.md`;

  // Check if design.md exists
  let designContent: string;
  try {
    designContent = await fs.readFile(designPath, 'utf-8');
  } catch {
    // No design.md, nothing to apply
    return false;
  }

  // Check if it has architectural impact
  if (!hasArchitecturalImpact(designContent)) {
    return false;
  }

  // Check if architecture.md exists
  let archContent: string;
  try {
    archContent = await fs.readFile(architecturePath, 'utf-8');
  } catch {
    // architecture.md doesn't exist, skip
    return false;
  }

  // Extract decision
  const decision = extractArchitecturalDecision(
    designContent,
    changeName,
    archiveDate
  );

  if (!decision) {
    return false;
  }

  // Apply decision
  const updatedContent = appendArchitecturalDecision(archContent, decision);

  // Write updated content
  await fs.writeFile(architecturePath, updatedContent);

  return true;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

function escapeTableCell(text: string): string {
  // Escape pipe characters and newlines for markdown table compatibility
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
