---
"pscode": minor
---

feat(dixi): add architectural skeleton for Java (hexagonal) and React (feature-sliced) profiles

`pscode init --profile dixi` now creates an opinionated project structure based on detected stack:

- **Java/Maven**: 10 hexagonal directories with `.gitkeep` (`domain/model`, `domain/port/in`, `domain/port/out`, `application/usecase`, `infrastructure/adapter/in/rest`, `infrastructure/adapter/out/persistence`, `infrastructure/config` + test equivalents) plus `ArchitectureTest.java` pre-configured with 3 ArchUnit rules
- **React/Next**: 7 feature-sliced directories (`shared/components/ui`, `shared/hooks`, `shared/services`, `shared/types`, `shared/utils`, `entities`, `features`) with `features/README.md` documenting conventions and `eslint-architecture.mjs` template with `no-restricted-imports` rules

All operations are brownfield-safe (skip if already exists). The `basePackage` for Java is auto-detected from `pom.xml` with fallback to `com.example.app`.
