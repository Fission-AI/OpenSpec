# Tasks

## 1. Declare parent roots

- [x] 1.1 Parse path entries in `references:` without changing Store entries
- [x] 1.2 Restrict local paths to canonical strict ancestors with an OpenSpec root

## 2. Inherit read-only context

- [x] 2.1 Index parent specs in artifact and apply instructions
- [x] 2.2 Inherit parent context within the existing prompt-size limit
- [x] 2.3 Resolve parent schemas after child-local schemas

## 3. Preserve root isolation

- [x] 3.1 Keep root selection and all write paths unchanged
- [x] 3.2 Show local parents in doctor and context output
- [x] 3.3 Prove child creation and archive never write to the parent root

## 4. Document and verify

- [x] 4.1 Document monorepo configuration and boundaries
- [x] 4.2 Add config, reference, schema, and CLI regression tests
