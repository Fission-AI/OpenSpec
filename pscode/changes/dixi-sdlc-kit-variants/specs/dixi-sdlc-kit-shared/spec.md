## ADDED Requirements

### Requirement: Commitlint config is installed for all stacks
The system SHALL install `.commitlintrc.yml` extending `@commitlint/config-conventional` with `subject-case: lower-case` enforced as error and a JIRA ticket pattern (`[A-Z]+-\d+`) validated as warning.

#### Scenario: Java project gets commitlint config
- **WHEN** `pscode init --profile dixi` runs on a project where `family: java`
- **THEN** `.commitlintrc.yml` is created in the project root with conventional commit rules and JIRA ticket warning rule

#### Scenario: React project gets commitlint config
- **WHEN** `pscode init --profile dixi` runs on a project where `family: react`
- **THEN** `.commitlintrc.yml` is created in the project root with conventional commit rules and JIRA ticket warning rule

#### Scenario: Existing commitlint config is not overwritten
- **WHEN** `.commitlintrc.yml` already exists in the project root
- **THEN** the file is left unchanged and installation continues without error

### Requirement: PR template is installed for all stacks
The system SHALL install `.github/pull_request_template.md` with sections: O que muda, Por que (contexto + ticket), Como testar, and Checklist (testes passando, sem TODO pendente, CHANGELOG atualizado, PR title em conventional commit format).

#### Scenario: PR template is always installed
- **WHEN** `pscode init --profile dixi` runs regardless of family
- **THEN** `.github/pull_request_template.md` is created or overwritten with the Dixi standard template

#### Scenario: GitHub directory is created if absent
- **WHEN** `.github/` directory does not exist in the project root
- **THEN** the directory is created before writing the template
