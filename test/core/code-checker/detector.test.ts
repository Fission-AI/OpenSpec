import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { detectChecks } from '../../../src/core/code-checker/detector.js';

describe('detectChecks', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-detector-tmp');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('returns null when no recognizable project files exist', () => {
    const result = detectChecks(testDir);
    expect(result).toBeNull();
  });

  it('detects TypeScript checks when package.json + tsconfig.json exist', async () => {
    await fs.writeFile(path.join(testDir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(testDir, 'tsconfig.json'), '{}', 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'TypeScript type check')).toBe(true);
  });

  it('detects ESLint when eslint config exists', async () => {
    await fs.writeFile(path.join(testDir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(testDir, '.eslintrc.json'), '{}', 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'ESLint')).toBe(true);
  });

  it('detects Rust checks when Cargo.toml exists', async () => {
    await fs.writeFile(path.join(testDir, 'Cargo.toml'), '[package]', 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'Rust compile check')).toBe(true);
    expect(result!.detected.some((c) => c.name === 'Rust clippy')).toBe(true);
  });

  it('detects Python checks when pyproject.toml exists', async () => {
    await fs.writeFile(path.join(testDir, 'pyproject.toml'), '[project]', 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'Python ruff check')).toBe(true);
    expect(result!.detected.some((c) => c.name === 'Python mypy')).toBe(true);
  });

  it('detects Go checks when go.mod exists', async () => {
    await fs.writeFile(path.join(testDir, 'go.mod'), 'module test', 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'Go vet')).toBe(true);
  });

  it('detects Java Maven checks when pom.xml exists', async () => {
    await fs.writeFile(path.join(testDir, 'pom.xml'), '<project></project>', 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'Java Maven compile')).toBe(true);
  });

  it('detects Java Checkstyle from Maven pom.xml', async () => {
    const pom = `<project>
      <build>
        <plugins>
          <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-checkstyle-plugin</artifactId>
          </plugin>
        </plugins>
      </build>
    </project>`;
    await fs.writeFile(path.join(testDir, 'pom.xml'), pom, 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'Java Checkstyle')).toBe(true);
  });

  it('detects Java SpotBugs from Maven pom.xml', async () => {
    const pom = `<project>
      <build>
        <plugins>
          <plugin>
            <groupId>com.github.spotbugs</groupId>
            <artifactId>spotbugs-maven-plugin</artifactId>
          </plugin>
        </plugins>
      </build>
    </project>`;
    await fs.writeFile(path.join(testDir, 'pom.xml'), pom, 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'Java SpotBugs')).toBe(true);
  });

  it('detects Java PMD from Maven pom.xml', async () => {
    const pom = `<project>
      <build>
        <plugins>
          <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-pmd-plugin</artifactId>
          </plugin>
        </plugins>
      </build>
    </project>`;
    await fs.writeFile(path.join(testDir, 'pom.xml'), pom, 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'Java PMD')).toBe(true);
  });

  it('detects Java Gradle checks when build.gradle exists', async () => {
    await fs.writeFile(path.join(testDir, 'build.gradle'), "plugins { id 'java' }", 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'Java Gradle check')).toBe(true);
  });

  it('detects Java offline checks from build.gradle', async () => {
    const gradle = `plugins {
      id 'java'
      id 'checkstyle'
      id 'com.github.spotbugs'
      id 'pmd'
    }`;
    await fs.writeFile(path.join(testDir, 'build.gradle'), gradle, 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'Java Checkstyle (Gradle)')).toBe(true);
    expect(result!.detected.some((c) => c.name === 'Java SpotBugs (Gradle)')).toBe(true);
    expect(result!.detected.some((c) => c.name === 'Java PMD (Gradle)')).toBe(true);
  });

  it('detects Java Gradle checks when build.gradle.kts exists', async () => {
    await fs.writeFile(path.join(testDir, 'build.gradle.kts'), "plugins { java }", 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'Java Gradle check')).toBe(true);
  });

  it('detects Ruby checks when Gemfile exists', async () => {
    await fs.writeFile(path.join(testDir, 'Gemfile'), "source 'https://rubygems.org'", 'utf-8');

    const result = detectChecks(testDir);
    expect(result).not.toBeNull();
    expect(result!.detected.some((c) => c.name === 'RuboCop')).toBe(true);
  });
});
