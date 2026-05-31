## ADDED Requirements

### Requirement: installDixiExtras copies SDLC kit by detected stack
The `installDixiExtras` function SHALL copy the shared SDLC kit files unconditionally and the stack-specific kit files based on the `family` field in `.pscode-dixi.yaml`. If `family` is absent or unknown, only shared files are installed.

#### Scenario: Java family triggers java kit installation
- **WHEN** `.pscode-dixi.yaml` contains `family: java`
- **THEN** `pscode/content/dixi/kit/shared/` and `pscode/content/dixi/kit/java/` files are copied to the project root

#### Scenario: React family triggers react kit installation
- **WHEN** `.pscode-dixi.yaml` contains `family: react`
- **THEN** `pscode/content/dixi/kit/shared/` and `pscode/content/dixi/kit/react/` files are copied to the project root

#### Scenario: Missing family installs only shared kit
- **WHEN** `.pscode-dixi.yaml` does not contain a `family` field or the file is absent
- **THEN** only `pscode/content/dixi/kit/shared/` files are installed; no error is thrown

#### Scenario: Installation order is respected
- **WHEN** `pscode init --profile dixi` runs
- **THEN** SDLC kit installation runs after hook installation (Batch G) in the same `installDixiExtras` call
