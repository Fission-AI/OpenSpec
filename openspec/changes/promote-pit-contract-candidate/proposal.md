## Why

Research and spec documents often contain governance decisions before they are ready to become canonical product requirements. A useful promotion path cannot just write down the insight; it must show that source material can be distilled into an executable contract candidate and tied to a concrete test or evidence gate.

This change is a deliberately small PIT contract promotion trial. It promotes one recurring planning insight into an explicit contract-candidate record that names the source, contract shape, ownership boundary, and validation gate.

## What Changes

- Add a `planning-contract-promotion` capability delta defining how research/spec material becomes eligible for contract-candidate review.
- Require promoted candidates to cite the source document and the exact source claim being promoted.
- Require each candidate to map the promoted contract to either an automated test, a documented evidence gate, or an explicit reason no executable gate exists yet.
- Record candidate source `openspec/explorations/workspace-user-journeys.md`, where shared behavior promotion is described as a future long-lived contract concern.
- Keep this trial as reviewable OpenSpec artifact work only; no runtime behavior changes are proposed here.

## Capabilities

### New Capabilities

- `planning-contract-promotion`: Review path for promoting research/spec insights into executable contract candidates and evidence gates.

## Impact

- Documentation/spec artifact only.
- No runtime behavior, schema, command, or generated output changes.
- Follow-up implementation can use the contract to add validation, tests, or release evidence gates.