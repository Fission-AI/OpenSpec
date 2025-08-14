import { promises as fs } from 'fs';
import path from 'path';
import { select, confirm } from '@inquirer/prompts';
import { FileSystemUtils } from '../utils/file-system.js';

interface SpecUpdate {
  source: string;
  target: string;
  exists: boolean;
}

interface RenamedRequirement {
  from: string;
  to: string;
  content: string;
}

interface DeltaStats {
  added: number;
  modified: number;
  removed: number;
  renamed: number;
}

export class ArchiveCommand {
  async execute(changeName?: string, options: { yes?: boolean; skipSpecs?: boolean } = {}): Promise<void> {
    const targetPath = '.';
    const changesDir = path.join(targetPath, 'openspec', 'changes');
    const archiveDir = path.join(changesDir, 'archive');
    const mainSpecsDir = path.join(targetPath, 'openspec', 'specs');

    // Check if changes directory exists
    try {
      await fs.access(changesDir);
    } catch {
      throw new Error("No OpenSpec changes directory found. Run 'openspec init' first.");
    }

    // Get change name interactively if not provided
    if (!changeName) {
      const selectedChange = await this.selectChange(changesDir);
      if (!selectedChange) {
        console.log('No change selected. Aborting.');
        return;
      }
      changeName = selectedChange;
    }

    const changeDir = path.join(changesDir, changeName);

    // Verify change exists
    try {
      const stat = await fs.stat(changeDir);
      if (!stat.isDirectory()) {
        throw new Error(`Change '${changeName}' not found.`);
      }
    } catch {
      throw new Error(`Change '${changeName}' not found.`);
    }

    // Check for incomplete tasks
    const tasksPath = path.join(changeDir, 'tasks.md');
    const incompleteTasks = await this.checkIncompleteTasks(tasksPath);
    
    if (incompleteTasks > 0) {
      if (!options.yes) {
        const proceed = await confirm({
          message: `Warning: ${incompleteTasks} incomplete task(s) found. Continue?`,
          default: false
        });
        if (!proceed) {
          console.log('Archive cancelled.');
          return;
        }
      } else {
        console.log(`Warning: ${incompleteTasks} incomplete task(s) found. Continuing due to --yes flag.`);
      }
    }

    // Handle spec updates unless skipSpecs flag is set
    if (options.skipSpecs) {
      console.log('Skipping spec updates (--skip-specs flag provided).');
    } else {
      // Find specs to update
      const specUpdates = await this.findSpecUpdates(changeDir, mainSpecsDir);
      
      if (specUpdates.length > 0) {
        console.log('\nSpecs to update:');
        for (const update of specUpdates) {
          const status = update.exists ? 'update' : 'create';
          const capability = path.basename(path.dirname(update.target));
          console.log(`  ${capability}: ${status}`);
        }

        let shouldUpdateSpecs = true;
        if (!options.yes) {
          shouldUpdateSpecs = await confirm({
            message: 'Proceed with spec updates?',
            default: true
          });
          if (!shouldUpdateSpecs) {
            console.log('Skipping spec updates. Proceeding with archive.');
          }
        }

        if (shouldUpdateSpecs) {
          // Update specs
          for (const update of specUpdates) {
            await this.updateSpec(update);
          }
          console.log('Specs updated successfully.');
        }
      }
    }

    // Create archive directory with date prefix
    const archiveName = `${this.getArchiveDate()}-${changeName}`;
    const archivePath = path.join(archiveDir, archiveName);

    // Check if archive already exists
    try {
      await fs.access(archivePath);
      throw new Error(`Archive '${archiveName}' already exists.`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Create archive directory if needed
    await fs.mkdir(archiveDir, { recursive: true });

    // Move change to archive
    await fs.rename(changeDir, archivePath);
    
    console.log(`Change '${changeName}' archived as '${archiveName}'.`);
  }

  private async selectChange(changesDir: string): Promise<string | null> {
    // Get all directories in changes (excluding archive)
    const entries = await fs.readdir(changesDir, { withFileTypes: true });
    const changeDirs = entries
      .filter(entry => entry.isDirectory() && entry.name !== 'archive')
      .map(entry => entry.name)
      .sort();

    if (changeDirs.length === 0) {
      console.log('No active changes found.');
      return null;
    }

    console.log('Available changes:');
    const choices = changeDirs.map(name => ({
      name: name,
      value: name
    }));

    try {
      const answer = await select({
        message: 'Select a change to archive',
        choices
      });
      return answer;
    } catch (error) {
      // User cancelled (Ctrl+C)
      return null;
    }
  }

  private async checkIncompleteTasks(tasksPath: string): Promise<number> {
    try {
      const content = await fs.readFile(tasksPath, 'utf-8');
      const lines = content.split('\n');
      let incompleteTasks = 0;
      
      for (const line of lines) {
        if (line.includes('- [ ]')) {
          incompleteTasks++;
        }
      }
      
      return incompleteTasks;
    } catch {
      // No tasks.md file or error reading it
      return 0;
    }
  }

  private async findSpecUpdates(changeDir: string, mainSpecsDir: string): Promise<SpecUpdate[]> {
    const updates: SpecUpdate[] = [];
    const changeSpecsDir = path.join(changeDir, 'specs');

    try {
      const entries = await fs.readdir(changeSpecsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const specFile = path.join(changeSpecsDir, entry.name, 'spec.md');
          const targetFile = path.join(mainSpecsDir, entry.name, 'spec.md');
          
          try {
            await fs.access(specFile);
            
            // Check if target exists
            let exists = false;
            try {
              await fs.access(targetFile);
              exists = true;
            } catch {
              exists = false;
            }

            updates.push({
              source: specFile,
              target: targetFile,
              exists
            });
          } catch {
            // Source spec doesn't exist, skip
          }
        }
      }
    } catch {
      // No specs directory in change
    }

    return updates;
  }

  private async updateSpec(update: SpecUpdate): Promise<void> {
    // Create target directory if needed
    const targetDir = path.dirname(update.target);
    await fs.mkdir(targetDir, { recursive: true });

    // Read source content
    const sourceContent = await fs.readFile(update.source, 'utf-8');

    // Check if this is a delta spec
    if (this.isDeltaSpec(sourceContent)) {
      // Read existing spec if it exists
      let existingContent = '';
      if (update.exists) {
        try {
          existingContent = await fs.readFile(update.target, 'utf-8');
        } catch {
          // Target doesn't exist yet, treat as empty
          existingContent = '';
        }
      }

      // Apply delta changes
      const { content: updatedContent, stats } = this.applyDeltaChanges(existingContent, sourceContent);
      
      // Display stats
      const relativePath = path.relative('.', update.target);
      this.displayDeltaStats(relativePath, stats);

      // Write updated content
      await fs.writeFile(update.target, updatedContent);
    } else {
      // Not a delta spec, copy entire file (backward compatibility)
      await fs.writeFile(update.target, sourceContent);
    }
  }

  private getArchiveDate(): string {
    // Returns date in YYYY-MM-DD format
    return new Date().toISOString().split('T')[0];
  }

  private normalizeHeader(header: string): string {
    return header.trim();
  }

  private isDeltaSpec(content: string): boolean {
    return content.includes('## ADDED') || 
           content.includes('## MODIFIED') || 
           content.includes('## REMOVED') || 
           content.includes('## RENAMED');
  }

  private parseDeltaSections(content: string): {
    added: Map<string, string>;
    modified: Map<string, string>;
    removed: Map<string, string>;
    renamed: RenamedRequirement[];
  } {
    const sections = {
      added: new Map<string, string>(),
      modified: new Map<string, string>(),
      removed: new Map<string, string>(),
      renamed: [] as RenamedRequirement[]
    };

    const lines = content.split('\n');
    let currentSection: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED' | null = null;
    let currentRequirement: string | null = null;
    let requirementContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for section headers
      const sectionMatch = line.match(/^## (ADDED|MODIFIED|REMOVED|RENAMED)( Requirements)?$/);
      if (sectionMatch) {
        this.saveCurrentRequirement(currentSection, currentRequirement, requirementContent, sections);
        currentSection = sectionMatch[1] as 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED';
        currentRequirement = null;
        requirementContent = [];
      } else if (currentSection === 'RENAMED' && line.startsWith('### FROM:')) {
        // Handle FROM: header in RENAMED section
        this.saveCurrentRequirement(currentSection, currentRequirement, requirementContent, sections);
        const fromMatch = line.match(/^### FROM:\s*(.+)/);
        if (fromMatch) {
          currentRequirement = fromMatch[1];
          requirementContent = [];
        }
      } else if (currentSection === 'RENAMED' && line.startsWith('### TO:')) {
        // Handle TO: header in RENAMED section
        const toMatch = line.match(/^### TO:\s*(.+)/);
        if (toMatch && currentRequirement) {
          sections.renamed.push({
            from: this.normalizeHeader(currentRequirement),
            to: this.normalizeHeader(toMatch[1]),
            content: '' // RENAMED operations don't need content, they preserve existing
          });
          currentRequirement = null;
          requirementContent = [];
        }
      } else if (currentSection && line.startsWith('### ')) {
        // New requirement header (for non-RENAMED sections)
        this.saveCurrentRequirement(currentSection, currentRequirement, requirementContent, sections);
        currentRequirement = line.substring(4); // Remove '### '
        requirementContent = [line];
      } else if (currentRequirement !== null && currentSection !== 'RENAMED') {
        // Accumulate requirement content
        requirementContent.push(line);
      }
    }

    // Save any remaining requirement
    this.saveCurrentRequirement(currentSection, currentRequirement, requirementContent, sections);

    return sections;
  }

  private saveCurrentRequirement(
    section: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED' | null,
    header: string | null,
    content: string[],
    sections: ReturnType<typeof this.parseDeltaSections>
  ): void {
    if (!section || !header || section === 'RENAMED') return;

    const normalizedHeader = this.normalizeHeader(header);
    const fullContent = content.join('\n').trim();

    if (section === 'ADDED') {
      sections.added.set(normalizedHeader, fullContent);
    } else if (section === 'MODIFIED') {
      sections.modified.set(normalizedHeader, fullContent);
    } else if (section === 'REMOVED') {
      sections.removed.set(normalizedHeader, fullContent);
    }
  }

  private parseExistingSpec(content: string): Map<string, string> {
    const requirements = new Map<string, string>();
    const lines = content.split('\n');
    let currentRequirement: string | null = null;
    let requirementContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('### ')) {
        // Save previous requirement if exists
        if (currentRequirement) {
          requirements.set(this.normalizeHeader(currentRequirement), requirementContent.join('\n'));
        }
        // Start new requirement - extract the full header after ###
        currentRequirement = line.substring(4); // Remove '### '
        requirementContent = [line];
      } else if (currentRequirement) {
        requirementContent.push(line);
      }
    }

    // Save last requirement
    if (currentRequirement) {
      requirements.set(this.normalizeHeader(currentRequirement), requirementContent.join('\n'));
    }

    return requirements;
  }

  private validateDeltaOperations(
    deltaSections: ReturnType<typeof this.parseDeltaSections>,
    existingRequirements: Map<string, string>
  ): string[] {
    const errors: string[] = [];

    // Validate MODIFIED requirements exist
    for (const header of deltaSections.modified.keys()) {
      if (!existingRequirements.has(header)) {
        errors.push(`MODIFIED requirement not found: "${header}"`);
      }
    }

    // Validate REMOVED requirements exist
    for (const header of deltaSections.removed.keys()) {
      if (!existingRequirements.has(header)) {
        errors.push(`REMOVED requirement not found: "${header}"`);
      }
    }

    // Validate ADDED requirements don't already exist
    for (const header of deltaSections.added.keys()) {
      if (existingRequirements.has(header)) {
        errors.push(`ADDED requirement already exists: "${header}"`);
      }
    }

    // Validate RENAMED operations
    for (const rename of deltaSections.renamed) {
      if (!existingRequirements.has(rename.from)) {
        errors.push(`RENAMED FROM requirement not found: "${rename.from}"`);
      }
      if (existingRequirements.has(rename.to)) {
        errors.push(`RENAMED TO requirement already exists: "${rename.to}"`);
      }
      // Check if renamed requirement is also in ADDED
      if (deltaSections.added.has(rename.to)) {
        errors.push(`RENAMED requirement also in ADDED section: "${rename.to}"`);
      }
    }

    // Check for duplicate headers in resulting spec
    const resultingHeaders = new Set<string>();
    
    // Add existing headers (minus removed and renamed-from)
    for (const header of existingRequirements.keys()) {
      let isRemoved = deltaSections.removed.has(header);
      let isRenamedFrom = deltaSections.renamed.some(r => r.from === header);
      if (!isRemoved && !isRenamedFrom) {
        if (resultingHeaders.has(header)) {
          errors.push(`Duplicate header would result: "${header}"`);
        }
        resultingHeaders.add(header);
      }
    }

    // Add new headers (added and renamed-to)
    for (const header of deltaSections.added.keys()) {
      if (resultingHeaders.has(header)) {
        errors.push(`Duplicate header would result from ADDED: "${header}"`);
      }
      resultingHeaders.add(header);
    }

    for (const rename of deltaSections.renamed) {
      if (resultingHeaders.has(rename.to)) {
        errors.push(`Duplicate header would result from RENAMED: "${rename.to}"`);
      }
      resultingHeaders.add(rename.to);
    }

    return errors;
  }

  private applyDeltaChanges(
    existingContent: string,
    deltaContent: string
  ): { content: string; stats: DeltaStats } {
    const deltaSections = this.parseDeltaSections(deltaContent);
    const existingRequirements = this.parseExistingSpec(existingContent);

    // Validate operations
    const errors = this.validateDeltaOperations(deltaSections, existingRequirements);
    if (errors.length > 0) {
      throw new Error(`Delta validation failed:\n${errors.join('\n')}`);
    }

    // Apply changes in order: RENAMED → REMOVED → MODIFIED → ADDED
    const updatedRequirements = new Map(existingRequirements);

    // Apply RENAMED
    for (const rename of deltaSections.renamed) {
      const existingContent = updatedRequirements.get(rename.from);
      if (existingContent) {
        updatedRequirements.delete(rename.from);
        // Keep the existing content but update the header
        const lines = existingContent.split('\n');
        lines[0] = `### ${rename.to}`; // Replace the first line (header)
        updatedRequirements.set(rename.to, lines.join('\n'));
      }
    }

    // Apply REMOVED
    for (const header of deltaSections.removed.keys()) {
      updatedRequirements.delete(header);
    }

    // Apply MODIFIED
    for (const [header, content] of deltaSections.modified) {
      updatedRequirements.set(header, content);
    }

    // Apply ADDED
    for (const [header, content] of deltaSections.added) {
      updatedRequirements.set(header, content);
    }

    // Reconstruct the spec content
    const specLines: string[] = [];
    
    // Keep header content before first requirement
    const firstReqIndex = existingContent.search(/^### /m);
    if (firstReqIndex > 0) {
      specLines.push(existingContent.substring(0, firstReqIndex).trimEnd());
    }

    // Add requirements
    for (const [header, content] of updatedRequirements) {
      if (specLines.length > 0) {
        specLines.push('');
      }
      specLines.push(content);
    }

    const stats: DeltaStats = {
      added: deltaSections.added.size,
      modified: deltaSections.modified.size,
      removed: deltaSections.removed.size,
      renamed: deltaSections.renamed.length
    };

    return {
      content: specLines.join('\n'),
      stats
    };
  }

  private displayDeltaStats(specPath: string, stats: DeltaStats): void {
    console.log(`Applying changes to ${specPath}:`);
    if (stats.added > 0) console.log(`  + ${stats.added} added`);
    if (stats.modified > 0) console.log(`  ~ ${stats.modified} modified`);
    if (stats.removed > 0) console.log(`  - ${stats.removed} removed`);
    if (stats.renamed > 0) console.log(`  → ${stats.renamed} renamed`);
  }
}