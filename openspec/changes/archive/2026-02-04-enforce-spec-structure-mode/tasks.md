## 1. Implementation

- [x] 1.1 Add structure enforcement block in `validateSpecStructure()` in `src/utils/spec-discovery.ts`: flat rejects depth > 1, hierarchical rejects depth === 1, auto skips
- [x] 1.2 Add allowMixed enforcement block: when `structure === 'auto'` and `allowMixed === false`, detect and error on mixed flat/hierarchical specs

## 2. Tests

- [x] 2.1 Update three existing tests in `test/utils/spec-discovery.test.ts` (lines ~936-970) that assert structure has no effect — change to expect enforcement behavior
- [x] 2.2 Add tests for flat mode: rejects hierarchical, accepts flat
- [x] 2.3 Add tests for hierarchical mode: rejects flat, accepts hierarchical
- [x] 2.4 Add tests for allowMixed: false rejects mixed, passes uniform; ignored when structure is explicit

## 3. Verification

- [x] 3.1 Run `pnpm build` — no type errors
- [x] 3.2 Run `pnpm test` — all relevant tests pass (74/74)
