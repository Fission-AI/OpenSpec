# Tasks

## 1. Declare connected roots

- [x] 1.1 Parse path entries in `references:` without changing Store entries
- [x] 1.2 Restrict local paths to canonical ancestors or descendants with an OpenSpec root

## 2. Share read-only context

- [x] 2.1 Index parent specs in artifact and apply instructions
- [x] 2.2 Inherit parent context within the existing prompt-size limit
- [x] 2.3 Resolve parent schemas after child-local schemas
- [x] 2.4 Keep descendant configuration local while indexing its specs

## 3. Preserve root isolation

- [x] 3.1 Keep root selection and all write paths unchanged
- [x] 3.2 Show connected roots in doctor and context output
- [x] 3.3 Prove a real child spec merge and archive never write to the parent root
- [x] 3.4 Prove repository-level work can read an explicitly connected package spec

## 4. Document and verify

- [x] 4.1 Document monorepo configuration and boundaries
- [x] 4.2 Add config, reference, schema, and CLI regression tests
