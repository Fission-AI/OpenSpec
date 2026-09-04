# Tasks

## 1. Resolve the next step once
- [x] 1.1 Extract `resolveNextStep` returning the command and the sentence, leaving `buildNextSteps` returning exactly that sentence so the JSON contract is unchanged
- [x] 1.2 Pin the published sentences verbatim in a unit test, so splitting command from sentence cannot reword the contract

## 2. Render it on the text surface
- [x] 2.1 Print a `Next:` line from the resolved command, after the completion line rather than in place of it
- [x] 2.2 Thread the store selection into the renderer so the command carries `--store`
- [x] 2.3 Give every change in an `--all` sweep its own line, and a failed entry none

## 3. Cover the behavior
- [x] 3.1 Assert the ready, planning-complete, skipped, and custom-schema cases end to end
- [x] 3.2 Assert the printed command appears verbatim inside the JSON sentence, and that the line never leaks into `--json`

## 4. Record it
- [x] 4.1 Update the `cli-artifact-workflow` spec delta and the `docs/cli.md` status output example
