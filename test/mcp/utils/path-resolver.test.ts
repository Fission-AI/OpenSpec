import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import {
  resolveOpenSpecPaths,
  getOpenSpecDir,
  getChangePath,
  getSpecPath,
  getSpecsDir,
  getArchiveDir,
  getChangesDir,
  getAgentsPath,
  getProjectPath,
  getChangeProposalPath,
  getChangeTasksPath,
  getChangeDesignPath,
  getChangeSpecsDir,
  getChangeSpecDeltaPath,
  type PathConfig,
} from '../../../src/mcp/utils/path-resolver.js';

describe('path-resolver', () => {
  let testDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;

  beforeEach(async () => {
    // Use realpath to resolve symlinks (e.g., /var -> /private/var on macOS)
    const tmpBase = await fs.realpath(os.tmpdir());
    testDir = path.join(tmpBase, `openspec-mcp-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
    originalEnv = { ...process.env };
    originalCwd = process.cwd();
  });

  afterEach(async () => {
    process.env = originalEnv;
    process.chdir(originalCwd);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('resolveOpenSpecPaths', () => {
    describe('without OPENSPEC_ROOT', () => {
      beforeEach(() => {
        delete process.env.OPENSPEC_ROOT;
        delete process.env.OPENSPEC_AUTO_PROJECT_ROOT;
      });

      it('should use project path as specs root when provided', () => {
        const result = resolveOpenSpecPaths(testDir);

        expect(result.specsRoot).toBe(testDir);
        expect(result.projectRoot).toBe(testDir);
        expect(result.isAutoProjectRoot).toBe(false);
      });

      it('should use cwd as specs root when no path provided', async () => {
        process.chdir(testDir);
        const result = resolveOpenSpecPaths();
        const realTestDir = await fs.realpath(testDir);

        expect(result.specsRoot).toBe(realTestDir);
        expect(result.projectRoot).toBe(realTestDir);
        expect(result.isAutoProjectRoot).toBe(false);
      });

      it('should resolve relative project paths', async () => {
        process.chdir(testDir);
        const subdir = path.join(testDir, 'subproject');
        const result = resolveOpenSpecPaths('./subproject');
        const realSubdir = await fs.realpath(testDir).then((d) =>
          path.join(d, 'subproject')
        );

        expect(result.specsRoot).toBe(realSubdir);
        expect(result.projectRoot).toBe(realSubdir);
      });
    });

    describe('with OPENSPEC_ROOT (fixed root mode)', () => {
      let openspecRoot: string;

      beforeEach(async () => {
        openspecRoot = path.join(testDir, '.openspec');
        await fs.mkdir(openspecRoot, { recursive: true });
        process.env.OPENSPEC_ROOT = openspecRoot;
        delete process.env.OPENSPEC_AUTO_PROJECT_ROOT;
      });

      it('should use OPENSPEC_ROOT as specs root', () => {
        const projectPath = path.join(testDir, 'myproject');
        const result = resolveOpenSpecPaths(projectPath);

        expect(result.specsRoot).toBe(openspecRoot);
        expect(result.projectRoot).toBe(projectPath);
        expect(result.isAutoProjectRoot).toBe(false);
      });

      it('should resolve relative OPENSPEC_ROOT', async () => {
        process.chdir(testDir);
        process.env.OPENSPEC_ROOT = '.openspec';
        const result = resolveOpenSpecPaths(testDir);
        const realOpenspecRoot = await fs.realpath(openspecRoot);

        expect(result.specsRoot).toBe(realOpenspecRoot);
      });
    });

    describe('with OPENSPEC_AUTO_PROJECT_ROOT', () => {
      let openspecRoot: string;

      beforeEach(async () => {
        openspecRoot = path.join(testDir, '.openspec');
        await fs.mkdir(openspecRoot, { recursive: true });
        process.env.OPENSPEC_ROOT = openspecRoot;
        process.env.OPENSPEC_AUTO_PROJECT_ROOT = 'true';
      });

      it('should create project-specific directory under OPENSPEC_ROOT', async () => {
        const projectPath = path.join(os.homedir(), 'code', 'myproject');
        const result = resolveOpenSpecPaths(projectPath);

        expect(result.isAutoProjectRoot).toBe(true);
        expect(result.projectRoot).toBe(projectPath);
        expect(result.specsRoot).toContain(openspecRoot);
        expect(result.specsRoot).toContain('myproject');
      });

      it('should use basename for paths outside home directory', () => {
        const projectPath = '/var/projects/myapp';
        const result = resolveOpenSpecPaths(projectPath);

        expect(result.specsRoot).toBe(path.join(openspecRoot, 'myapp'));
      });

      it('should strip home prefix for paths inside home directory', () => {
        const homeDir = os.homedir();
        const projectPath = path.join(homeDir, 'workspace', 'project');
        const result = resolveOpenSpecPaths(projectPath);

        expect(result.specsRoot).toBe(
          path.join(openspecRoot, 'workspace', 'project')
        );
      });
    });
  });

  describe('getOpenSpecDir', () => {
    it('should return openspec subdirectory of specsRoot', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getOpenSpecDir(config);

      expect(result).toBe('/home/user/project/openspec');
    });
  });

  describe('getChangePath', () => {
    it('should return path to change directory', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getChangePath(config, 'add-mcp-server');

      expect(result).toBe('/home/user/project/openspec/changes/add-mcp-server');
    });
  });

  describe('getSpecPath', () => {
    it('should return path to spec file', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getSpecPath(config, 'user-auth');

      expect(result).toBe(
        '/home/user/project/openspec/specs/user-auth/spec.md'
      );
    });
  });

  describe('getSpecsDir', () => {
    it('should return specs directory path', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getSpecsDir(config);

      expect(result).toBe('/home/user/project/openspec/specs');
    });

    it('should work with auto project root mode', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/.openspec/code/myapp',
        projectRoot: '/home/user/code/myapp',
        isAutoProjectRoot: true,
      };

      const result = getSpecsDir(config);

      expect(result).toBe('/home/user/.openspec/code/myapp/openspec/specs');
    });
  });

  describe('getArchiveDir', () => {
    it('should return archive directory path', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getArchiveDir(config);

      expect(result).toBe('/home/user/project/openspec/changes/archive');
    });
  });

  describe('getChangesDir', () => {
    it('should return changes directory path', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getChangesDir(config);

      expect(result).toBe('/home/user/project/openspec/changes');
    });
  });

  describe('getAgentsPath', () => {
    it('should return AGENTS.md file path', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getAgentsPath(config);

      expect(result).toBe('/home/user/project/openspec/AGENTS.md');
    });
  });

  describe('getProjectPath', () => {
    it('should return project.md file path', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getProjectPath(config);

      expect(result).toBe('/home/user/project/openspec/project.md');
    });
  });

  describe('getChangeProposalPath', () => {
    it('should return proposal.md path for a change', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getChangeProposalPath(config, 'add-feature');

      expect(result).toBe(
        '/home/user/project/openspec/changes/add-feature/proposal.md'
      );
    });
  });

  describe('getChangeTasksPath', () => {
    it('should return tasks.md path for a change', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getChangeTasksPath(config, 'add-feature');

      expect(result).toBe(
        '/home/user/project/openspec/changes/add-feature/tasks.md'
      );
    });
  });

  describe('getChangeDesignPath', () => {
    it('should return design.md path for a change', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getChangeDesignPath(config, 'add-feature');

      expect(result).toBe(
        '/home/user/project/openspec/changes/add-feature/design.md'
      );
    });
  });

  describe('getChangeSpecsDir', () => {
    it('should return specs directory path within a change', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getChangeSpecsDir(config, 'add-feature');

      expect(result).toBe(
        '/home/user/project/openspec/changes/add-feature/specs'
      );
    });
  });

  describe('getChangeSpecDeltaPath', () => {
    it('should return spec delta path for a capability within a change', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getChangeSpecDeltaPath(config, 'add-feature', 'auth');

      expect(result).toBe(
        '/home/user/project/openspec/changes/add-feature/specs/auth/spec.md'
      );
    });

    it('should handle nested capability names', () => {
      const config: PathConfig = {
        specsRoot: '/home/user/project',
        projectRoot: '/home/user/project',
        isAutoProjectRoot: false,
      };

      const result = getChangeSpecDeltaPath(config, 'add-feature', 'user-management');

      expect(result).toBe(
        '/home/user/project/openspec/changes/add-feature/specs/user-management/spec.md'
      );
    });
  });
});
