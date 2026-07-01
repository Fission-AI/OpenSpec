# Distributing the OpenSpec agent skills

OpenSpec generates a standard-conformant Agent Skills package per skill under
`<tool>/skills/<name>/` (a `SKILL.md` with `allowed-tools` frontmatter, plus a
`references/` folder where a skill links deep material). Conformance is enforced
at generation time (`openspec init`/`update` fail rather than write a
non-conformant skill) and in CI (`test/core/shared/skill-conformance.test.ts`
validates every generated skill), so the emitted set is always a **validated,
publishable bundle**.

## The bundle

The bundle is just the validated set of skill folders, regenerable from the
templates:

```
<tool>/skills/
  openspec-propose/
    SKILL.md               # name, description, allowed-tools, license, compatibility
    references/
      authoring-conventions.md
  openspec-continue-change/
    SKILL.md
    references/authoring-conventions.md
  …
```

No separate build step is required — `openspec init`/`update` emit exactly this,
and generation is blocked if any skill fails conformance.

## Listing checklist

To list the skills in a public Agent Skills directory (e.g. the standard at
agentskills.io, or the skills.sh directory):

1. **Regenerate** the skills from current templates (`openspec update`) so the
   OpenSpec version is stamped into each skill's `metadata.generatedBy`.
2. **Validate** the bundle: `pnpm test -- skill-conformance` — every skill must
   pass the conformance gate (frontmatter validity, `name` == folder,
   resolvable `references/` links, declared `allowed-tools`). A single failure
   blocks the listing.
3. **Confirm metadata** on every skill: `license`, `metadata.author`, and a
   keyword-rich `description` that states both *what* and *when*.
4. **Submit** per the target directory's process.

The directory applies its own curation and security review (ranging from none to
an audited verification), which OpenSpec does not control. Automating submission
is a non-goal; the value here is a bundle that always passes validation and a
path a maintainer can follow.
