## Purpose

Defines the Java-specific SDLC kit files installed by `installDixiExtras` when the detected project family is `java`. Covers editor configuration, Husky commit hooks, and GitHub Actions CI pipeline for Java/Maven projects.

## Requirements

### Requirement: Java editorconfig is installed
The system SHALL install `.editorconfig` for Java projects with: `[*.java]` indent_size=4, charset=utf-8, end_of_line=lf; `[*.{yml,yaml}]` indent_size=2; `[*.xml]` indent_size=4; `[*.properties]` indent_size=4.

#### Scenario: Java project receives editorconfig
- **WHEN** `pscode init --profile dixi` runs on a project where `family: java`
- **THEN** `.editorconfig` is created with Java-specific indent rules

#### Scenario: Existing editorconfig is preserved
- **WHEN** `.editorconfig` already exists in the project root and `family: java`
- **THEN** the file is left unchanged

### Requirement: Husky commit-msg hook is installed for Java
The system SHALL install `.husky/commit-msg` shell script that runs `npx --no-install commitlint --edit "$1"` for Java projects.

#### Scenario: commit-msg hook is created
- **WHEN** `pscode init --profile dixi` runs on a project where `family: java`
- **THEN** `.husky/commit-msg` is created and made executable (chmod +x on Unix)

#### Scenario: Existing commit-msg hook is preserved
- **WHEN** `.husky/commit-msg` already exists
- **THEN** the file is left unchanged

### Requirement: GitHub Actions CI workflow for Java is installed
The system SHALL install `.github/workflows/ci-java.yml` with jobs: `build` (setup-java@v4 Java 21 temurin, Maven cache, `mvn compile`), `test` (`mvn test`), `archunit` (`mvn test -Dtest=ArchitectureTest`, fails if ArchUnit not present), `coverage` (`mvn jacoco:report` with coverage artifact upload). Trigger: push and pull_request on `main` and `develop`.

#### Scenario: CI workflow is created for Java project
- **WHEN** `pscode init --profile dixi` runs on a project where `family: java`
- **THEN** `.github/workflows/ci-java.yml` is created with all four jobs

#### Scenario: Existing CI workflow is preserved
- **WHEN** `.github/workflows/ci-java.yml` already exists
- **THEN** the file is left unchanged

#### Scenario: Post-install message is shown
- **WHEN** the Java kit is installed
- **THEN** the CLI prints a message instructing to add `commitlint` and Jacoco to `pom.xml`
