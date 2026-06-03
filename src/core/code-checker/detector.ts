import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { CheckEntry } from './types.js';

export interface DetectedChecks {
  detected: CheckEntry[];
  message: string;
}

/**
 * Inspect project root for common config files and suggest appropriate static checks.
 * This is best-effort and intended to help users bootstrap their config.yaml.
 */
export function detectChecks(projectRoot: string): DetectedChecks | null {
  const detected: CheckEntry[] = [];

  const hasFile = (name: string) => existsSync(path.join(projectRoot, name));

  // TypeScript / JavaScript
  if (hasFile('package.json')) {
    if (hasFile('tsconfig.json')) {
      detected.push({
        name: 'TypeScript type check',
        command: 'npx tsc --noEmit',
      });
    }

    const hasEslintConfig =
      hasFile('.eslintrc.js') ||
      hasFile('.eslintrc.cjs') ||
      hasFile('.eslintrc.json') ||
      hasFile('.eslintrc.yaml') ||
      hasFile('.eslintrc.yml') ||
      hasFile('eslint.config.js') ||
      hasFile('eslint.config.mjs') ||
      hasFile('eslint.config.cjs') ||
      hasFile('eslint.config.ts');

    if (hasEslintConfig) {
      detected.push({
        name: 'ESLint',
        command: 'npx eslint . --ext .js,.ts,.jsx,.tsx',
      });
    }

    if (hasFile('prettier.config.js') || hasFile('.prettierrc') || hasFile('.prettierrc.json')) {
      detected.push({
        name: 'Prettier format check',
        command: 'npx prettier --check .',
      });
    }
  }

  // Rust
  if (hasFile('Cargo.toml')) {
    detected.push({
      name: 'Rust compile check',
      command: 'cargo check',
    });
    detected.push({
      name: 'Rust clippy',
      command: 'cargo clippy -- -D warnings',
    });
  }

  // Python
  if (hasFile('pyproject.toml') || hasFile('setup.py') || hasFile('requirements.txt')) {
    detected.push({
      name: 'Python ruff check',
      command: 'ruff check .',
    });
    if (hasFile('pyproject.toml')) {
      detected.push({
        name: 'Python mypy',
        command: 'mypy .',
      });
    }
  }

  // Go
  if (hasFile('go.mod')) {
    detected.push({
      name: 'Go vet',
      command: 'go vet ./...',
    });
  }

  // Java — Maven
  if (hasFile('pom.xml')) {
    detected.push({
      name: 'Java Maven compile',
      command: 'mvn compile -q',
    });

    try {
      const pomContent = readFileSync(path.join(projectRoot, 'pom.xml'), 'utf-8').toLowerCase();
      if (
        pomContent.includes('maven-checkstyle-plugin') ||
        pomContent.includes('checkstyle') && pomContent.includes('<artifactid>')
      ) {
        detected.push({
          name: 'Java Checkstyle',
          command: 'mvn checkstyle:check -q',
        });
      }
      if (
        pomContent.includes('spotbugs-maven-plugin') ||
        pomContent.includes('findbugs-maven-plugin') ||
        pomContent.includes('com.github.spotbugs')
      ) {
        detected.push({
          name: 'Java SpotBugs',
          command: 'mvn spotbugs:check -q',
        });
      }
      if (
        pomContent.includes('maven-pmd-plugin') ||
        (pomContent.includes('pmd') && pomContent.includes('<artifactid>'))
      ) {
        detected.push({
          name: 'Java PMD',
          command: 'mvn pmd:check -q',
        });
      }
    } catch {
      // ignore read errors
    }
  }

  // Java — Gradle
  if (hasFile('build.gradle') || hasFile('build.gradle.kts')) {
    const gradleCmd = process.platform === 'win32' ? 'gradlew' : './gradlew';
    detected.push({
      name: 'Java Gradle check',
      command: `${gradleCmd} check`,
    });

    for (const gradleFile of ['build.gradle', 'build.gradle.kts']) {
      if (!hasFile(gradleFile)) continue;
      try {
        const gradleContent = readFileSync(path.join(projectRoot, gradleFile), 'utf-8').toLowerCase();
        if (gradleContent.includes('checkstyle')) {
          detected.push({
            name: 'Java Checkstyle (Gradle)',
            command: `${gradleCmd} checkstyleMain checkstyleTest`,
          });
        }
        if (gradleContent.includes('spotbugs')) {
          detected.push({
            name: 'Java SpotBugs (Gradle)',
            command: `${gradleCmd} spotbugsMain`,
          });
        }
        if (gradleContent.includes('pmd')) {
          detected.push({
            name: 'Java PMD (Gradle)',
            command: `${gradleCmd} pmdMain`,
          });
        }
        break; // only read the first existing file
      } catch {
        // ignore read errors
      }
    }
  }

  // Ruby
  if (hasFile('Gemfile')) {
    detected.push({
      name: 'RuboCop',
      command: 'bundle exec rubocop',
    });
  }

  if (detected.length === 0) {
    return null;
  }

  return {
    detected,
    message: `Detected ${detected.length} check(s) based on project files. Add them to openspec/config.yaml under the 'checks' key.`,
  };
}
