# ADR-Constrained DAG Schema

`adr-constrained-dag` is a spec-driven workflow variant for teams that want:

- project constraints defined in `openspec/config.yaml`
- every constraint backed by an ADR
- design docs that explicitly show constraint alignment
- task lists with dependency metadata (`depends_on`) and traceability

## Philosophy

This schema does not add a new required artifact type.
It keeps OpenSpec's familiar flow:

proposal → specs → design → tasks → apply

The governance additions are lightweight:

- `config.yaml` carries project constraints in `context`
- `openspec/adrs/` stores the rationale for each constraint
- `tasks.md` stays a checkbox list for apply compatibility
- task items include DAG metadata and traceability fields

## Example config

```yaml
schema: adr-constrained-dag

context: |
  Project constraints:
  - API-001: Preserve backward compatibility for public APIs by default. Backed by ADR-0003.
  - ARCH-002: Cross-domain async workflows must use the event bus. Backed by ADR-0007.

  Constraint policy:
  - Every change must identify which constraints apply.
  - If a change touches a constraint, proposal and design must reference its ADR.
  - If a change introduces a new long-lived architectural rule, create a new ADR and add the constraint here.
  - Archive is not allowed until artifacts, implementation, and ADR references are aligned.

rules:
  proposal:
    - State the intended outcome clearly.
    - List the applicable constraints by ID.
    - Reference the ADRs for those constraints.
  design:
    - Explain how the design satisfies each applicable constraint.
    - Reference the ADRs behind those constraints.
    - State whether a new ADR is required.
  tasks:
    - Every task must use checkbox format.
    - Every task must have a stable task ID.
    - Every task must declare depends_on.
    - Every task should reference requirements, constraints, and ADRs where applicable.
    - Order tasks topologically.
