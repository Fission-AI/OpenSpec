# Tasks: {{CHANGE_NAME}}

## Dependency map
- T01 is a root task
- T02 depends on T01
- T03 depends on T01
- T04 depends on T02, T03

## Tasks

- [ ] T01 <task title>
  - depends_on: []
  - requirements: [<requirement-id>]
  - constraints: [<constraint-id>]
  - adrs: [<ADR-id>]
  - done_when: <clear completion condition>

- [ ] T02 <task title>
  - depends_on: [T01]
  - requirements: [<requirement-id>]
  - constraints: [<constraint-id>]
  - adrs: [<ADR-id>]
  - done_when: <clear completion condition>

- [ ] T03 <task title>
  - depends_on: [T01]
  - requirements: [<requirement-id>]
  - constraints: []
  - adrs: []
  - done_when: <clear completion condition>

- [ ] T04 <task title>
  - depends_on: [T02, T03]
  - requirements: [<requirement-id>]
  - constraints: [<constraint-id>]
  - adrs: [<ADR-id>]
  - done_when: <clear completion condition>
